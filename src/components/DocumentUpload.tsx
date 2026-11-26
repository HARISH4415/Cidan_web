import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { FolderOpen } from 'lucide-react'
import existingRulesUploadImage from '../assets/folder.png'
import newRuleUploadImage from '../assets/paper.png'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ACCEPTED_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
}

type DocumentUploadProps = {
  disabled?: boolean
  multiple?: boolean
  selectedFiles: File[]
  onFilesSelected: (files: File[]) => void
}

function isSameFile(first: File, second: File) {
  return first.name === second.name
    && first.size === second.size
    && first.lastModified === second.lastModified
}

function DocumentUpload({
  disabled = false,
  multiple = false,
  selectedFiles,
  onFilesSelected,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  function handleFiles(files: FileList | File[]) {
    if (disabled || files.length === 0) return

    const accepted: File[] = []
    let validationError = ''

    for (const file of Array.from(files)) {
      if (selectedFiles.some((selected) => isSameFile(selected, file))
        || accepted.some((selected) => isSameFile(selected, file))) {
        validationError = `${file.name} is already selected.`
        continue
      }

      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      const acceptedMimeTypes = ACCEPTED_TYPES[extension]
      if (!acceptedMimeTypes) {
        validationError = `${file.name} has an unsupported format. Choose PDF, DOCX, or DOC files.`
        continue
      }

      if (file.type && !acceptedMimeTypes.includes(file.type)) {
        validationError = `${file.name} does not match its file extension.`
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        validationError = `${file.name} is larger than 50 MB. Choose a smaller file.`
        continue
      }

      accepted.push(file)
    }

    if (accepted.length > 0) {
      onFilesSelected(multiple ? [...selectedFiles, ...accepted] : [accepted[accepted.length - 1]])
    }
    setError(validationError)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files) handleFiles(event.currentTarget.files)
    event.currentTarget.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
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
          multiple={multiple}
          accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleInputChange}
          disabled={disabled}
          aria-label="Choose a document"
        />
        <div className="upload-icon" aria-hidden="true">
          <img src={multiple ? existingRulesUploadImage : newRuleUploadImage} alt="" />
        </div>
        <p className="upload-prompt">
          {multiple ? 'Drag & Drop your files here' : 'Drag & Drop your file here'}
        </p>
        <div className="upload-or"><span />or<span /></div>
        <button
          className="choose-file-button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <FolderOpen size={16} aria-hidden="true" />
          {multiple ? 'Choose Files' : 'Choose File'}
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
