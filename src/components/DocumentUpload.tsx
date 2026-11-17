import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { CloudUpload, FolderOpen } from 'lucide-react'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ACCEPTED_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
}

type DocumentUploadProps = {
  disabled?: boolean
  selectedFile: File | null
  onFileSelected: (file: File) => void
}

function isSameFile(first: File, second: File) {
  return first.name === second.name
    && first.size === second.size
    && first.lastModified === second.lastModified
}

function DocumentUpload({ disabled = false, selectedFile, onFileSelected }: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file: File | undefined) {
    if (!file || disabled) return

    if (selectedFile && isSameFile(selectedFile, file)) {
      setError('This document is already selected.')
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    const acceptedMimeTypes = ACCEPTED_TYPES[extension]
    if (!acceptedMimeTypes) {
      setError('Unsupported file format. Choose a PDF, DOCX, or DOC file.')
      return
    }

    if (file.type && !acceptedMimeTypes.includes(file.type)) {
      setError('The file type does not match its extension. Choose a valid PDF, DOCX, or DOC file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('The selected document is larger than 50 MB. Choose a smaller file.')
      return
    }

    setError('')
    onFileSelected(file)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.currentTarget.files?.[0])
    event.currentTarget.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files[0])
  }

  return (
    <div className="upload-field">
      <div
        className={`upload-dropzone${isDragging ? ' upload-dropzone--active' : ''}${disabled ? ' upload-dropzone--disabled' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          const nextTarget = event.relatedTarget
          if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
            setIsDragging(false)
          }
        }}
        onDrop={handleDrop}
        aria-label="Document drop area"
      >
        <input
          ref={fileInputRef}
          className="upload-input"
          type="file"
          accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleInputChange}
          disabled={disabled}
          aria-label="Choose a document"
        />
        <div className="upload-icon" aria-hidden="true">
          <CloudUpload size={27} strokeWidth={1.8} />
        </div>
        <p className="upload-prompt">Drag &amp; Drop your file here</p>
        <div className="upload-or"><span />or<span /></div>
        <button
          className="choose-file-button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <FolderOpen size={16} aria-hidden="true" />
          Choose File
        </button>
      </div>
      <p className="upload-supported">Supported formats: PDF, DOCX, DOC (Max 50 MB)</p>
      <div className="upload-error" aria-live="polite">
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  )
}

export { DocumentUpload }
