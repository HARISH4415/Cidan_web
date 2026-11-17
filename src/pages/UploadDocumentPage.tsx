import { useState, type SyntheticEvent } from 'react'
import { ArrowRight, FileCheck2, LoaderCircle, ShieldCheck, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { DocumentUpload } from '../components/DocumentUpload'
import { SelectedFileCard } from '../components/SelectedFileCard'
import { AIChatbot } from '../components/AIChatbot'
import bankingArtwork from '../assets/bank img.png'
import circularAnalysisVideo from '../assets/cidan-circular-analysis-7s.mp4'
import { createWorkflowId } from '../utils/workflowId'
import { saveDocumentWorkflow } from '../utils/workflowState'
import './UploadDocumentPage.css'

const ANALYSIS_STEPS = [
  'Uploading circular...',
  'Extracting obligations...',
  'Mapping to your existing rules...',
  'Backtesting in sandbox...',
  'Analysis complete',
]
const FALLBACK_VIDEO_DURATION = 7

function UploadDocumentPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleUpload() {
    if (!selectedFile || isUploading) return

    setIsUploading(true)
    setIsAnalysisComplete(false)
    setAnalysisStep(0)
    setStatus(null)
  }

  function handleVideoTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    const duration = event.currentTarget.duration
    const stepDuration = Number.isFinite(duration) && duration > 0
      ? duration / ANALYSIS_STEPS.length
      : FALLBACK_VIDEO_DURATION / ANALYSIS_STEPS.length
    const currentStep = Math.min(
      Math.floor(event.currentTarget.currentTime / stepDuration),
      ANALYSIS_STEPS.length - 1,
    )
    setAnalysisStep(currentStep)
  }

  function handleVideoEnded() {
    setAnalysisStep(ANALYSIS_STEPS.length - 1)
    setIsUploading(false)
    setIsAnalysisComplete(true)
    if (selectedFile) {
      const workflowId = createWorkflowId()
      saveDocumentWorkflow({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        workflowId,
        status: 'analysis-complete',
      })
    }
    navigate('/compliance-analysis', {
      state: { fileName: selectedFile?.name },
    })
  }

  function handleVideoError() {
    setIsUploading(false)
    setStatus({
      type: 'error',
      text: 'The analysis video could not be played. Please try again.',
    })
  }

  function handleFileSelected(file: File) {
    setSelectedFile(file)
    setStatus(null)
  }

  function handleRemoveFile() {
    setSelectedFile(null)
    setStatus(null)
  }

  return (
    <main className="upload-page">
      {!isUploading && !isAnalysisComplete && <Header />}
      <div className="upload-page-content">
        <section className="upload-intro" aria-labelledby="upload-title">
          <div className="upload-illustration" aria-hidden="true">
            <img src={bankingArtwork} alt="" />
          </div>
          <div className="upload-heading">
            <span className="upload-eyebrow"><ShieldCheck size={14} /> SECURE DOCUMENT INTAKE</span>
            <h1 id="upload-title">Upload <span>Regulatory</span> Document</h1>
            <p>Upload RBI circulars, guidelines or internal policies.</p>
            <ul className="upload-benefits" aria-label="Upload benefits">
              <li><ShieldCheck size={15} aria-hidden="true" /><span>Secure Upload</span></li>
              <li><Zap size={15} aria-hidden="true" /><span>Fast Processing</span></li>
              <li><FileCheck2 size={15} aria-hidden="true" /><span>Policy Compliant</span></li>
            </ul>
          </div>
        </section>

        {isUploading || isAnalysisComplete ? (
          <section className="upload-main analysis-progress" aria-label="Document analysis progress">
            <div className="analysis-video">
              <video
                className="analysis-video-player"
                src={circularAnalysisVideo}
                autoPlay={!isAnalysisComplete}
                muted
                playsInline
                preload="auto"
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
                onError={handleVideoError}
                aria-label="Circular analysis animation"
              />
              <p className="analysis-video-status" aria-live="polite" aria-atomic="true">
                <LoaderCircle className="analysis-status-spinner" size={22} aria-hidden="true" />
                {ANALYSIS_STEPS[analysisStep]}
              </p>
            </div>
            {!isAnalysisComplete && (
              <p className="analysis-file-name" title={selectedFile?.name}>
                <LoaderCircle className="upload-spinner" size={15} aria-hidden="true" />
                Processing {selectedFile?.name}
              </p>
            )}
          </section>
        ) : (
          <section className="upload-main" aria-label="Document upload">
            <DocumentUpload
              disabled={isUploading}
              selectedFile={selectedFile}
              onFileSelected={handleFileSelected}
            />

            {selectedFile && (
              <SelectedFileCard file={selectedFile} disabled={isUploading} onRemove={handleRemoveFile} />
            )}

            <button
              className="upload-process-button"
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              <>
                Upload &amp; Process
                <ArrowRight size={18} aria-hidden="true" />
              </>
            </button>
            <div className={`upload-status${status ? ` upload-status--${status.type}` : ''}`} aria-live="polite">
              {status && <p role={status.type === 'error' ? 'alert' : 'status'}>{status.text}</p>}
            </div>
          </section>
        )}
      </div>
      {!isUploading && !isAnalysisComplete && <AIChatbot />}
    </main>
  )
}

export { UploadDocumentPage }
