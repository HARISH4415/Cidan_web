import { useEffect, useRef, useState } from 'react'
import { Download, FileText, X } from 'lucide-react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './PDFReportPreview.css'

type PDFReportPreviewProps = {
  blob: Blob
  reportId: string
  onClose: () => void
}

function PDFReportPreview({ blob, reportId, onClose }: PDFReportPreviewProps) {
  const [downloadMessage, setDownloadMessage] = useState('')
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [previewError, setPreviewError] = useState('')
  const pageContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | undefined
    async function loadPDF() {
      try {
        const pdfjs = await import('pdfjs-dist')
        if (cancelled) return
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
        const data = await blob.arrayBuffer()
        if (cancelled) return
        loadingTask = pdfjs.getDocument({ data })
        const documentProxy = await loadingTask.promise
        if (cancelled) return
        setPdfDocument(documentProxy)
        setPageCount(documentProxy.numPages)
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'The PDF preview could not be loaded.')
        }
      }
    }

    void loadPDF()
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelled = true
      if (loadingTask) void loadingTask.destroy()
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [blob, onClose])

  useEffect(() => {
    if (!pdfDocument || !pageContainerRef.current) return

    let cancelled = false
    async function renderPages() {
      try {
        const container = pageContainerRef.current
        if (!container) return
        const canvases = Array.from(container.querySelectorAll('canvas'))
        const deviceScale = window.devicePixelRatio || 1
        for (const [index, canvas] of canvases.entries()) {
          if (cancelled) return
          const page = await pdfDocument.getPage(index + 1)
          const baseViewport = page.getViewport({ scale: 1 })
          const width = Math.min(container.clientWidth, 850)
          const scale = width / baseViewport.width
          const viewport = page.getViewport({ scale })
          const context = canvas.getContext('2d')
          if (!context) throw new Error('The PDF page could not be rendered.')
          canvas.width = Math.ceil(viewport.width * deviceScale)
          canvas.height = Math.ceil(viewport.height * deviceScale)
          canvas.style.width = `${viewport.width}px`
          canvas.style.height = `${viewport.height}px`
          const renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: deviceScale === 1 ? undefined : [deviceScale, 0, 0, deviceScale, 0, 0],
          })
          await renderTask.promise
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'A PDF page could not be rendered.')
        }
      }
    }

    void renderPages()
    return () => {
      cancelled = true
    }
  }, [pageCount, pdfDocument])

  function handleDownload() {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `CIDAN_Compliance_Report_${reportId}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setDownloadMessage('Report downloaded successfully.')
  }

  return (
    <div className="pdf-preview-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="pdf-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title">
        <header className="pdf-preview-header">
          <div className="pdf-preview-title-group">
            <FileText size={20} aria-hidden="true" />
            <h2 id="pdf-preview-title" title="PDF Reference Document">PDF Reference Document</h2>
          </div>
          <div className="pdf-preview-actions">
            <button className="pdf-preview-download" type="button" onClick={handleDownload}>
              <Download size={17} aria-hidden="true" />
              Download
            </button>
            <button className="pdf-preview-close" type="button" onClick={onClose} aria-label="Close PDF preview">
              <X size={21} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="pdf-preview-scroll-area">
          {previewError ? (
            <p className="pdf-preview-error" role="alert">{previewError}</p>
          ) : !pdfDocument ? (
            <p className="pdf-preview-loading" role="status">Preparing report preview...</p>
          ) : (
            <div className="pdf-preview-document" ref={pageContainerRef} aria-label={`${pageCount}-page compliance report`}>
              {Array.from({ length: pageCount }, (_, index) => (
                <canvas key={index} aria-label={`Report page ${index + 1}`} />
              ))}
            </div>
          )}
          <div className="pdf-preview-bottom-action">
            <button className="pdf-preview-download pdf-preview-download--bottom" type="button" onClick={handleDownload}>
              <Download size={17} aria-hidden="true" />
              Download
            </button>
            {downloadMessage && <p className="pdf-download-confirmation" role="status">{downloadMessage}</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

export { PDFReportPreview }
