import { FileText, FileType2, X } from 'lucide-react'

type SelectedFileCardProps = {
  file: File
  disabled?: boolean
  status?: string
  onRemove: () => void
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function SelectedFileCard({
  file,
  disabled = false,
  status = 'Selected',
  onRemove,
}: SelectedFileCardProps) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const Icon = extension === 'pdf' ? FileType2 : FileText

  return (
    <div className="selected-file-card">
      <span className="selected-file-icon" aria-hidden="true"><Icon size={21} /></span>
      <span className="selected-file-info">
        <strong title={file.name}>{file.name}</strong>
        <span>{formatFileSize(file.size)} · {status}</span>
      </span>
      <button
        className="remove-file-button"
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
      >
        <X size={18} />
      </button>
    </div>
  )
}

export { SelectedFileCard }
