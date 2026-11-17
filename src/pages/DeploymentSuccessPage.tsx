import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, CheckCircle2, FileText, Upload } from 'lucide-react'
import { AIChatbot } from '../components/AIChatbot'
import { Header } from '../components/Header'
import verifiedBankChecklist from '../assets/Verified Bank Checklist.png'
import { clearDocumentWorkflow, getDocumentWorkflow } from '../utils/workflowState'
import './DeploymentSuccessPage.css'

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function DeploymentSuccessPage() {
  const navigate = useNavigate()
  const workflow = getDocumentWorkflow()
  const fileName = workflow?.fileName || 'Uploaded document'
  const fileSize = formatFileSize(workflow?.fileSize ?? 0)

  function handleUploadAnother() {
    clearDocumentWorkflow()
    navigate('/upload-document')
  }

  return (
    <main className="deployment-success-page">
      <Header />
      <div className="success-page-content">
        <img
          className="success-illustration"
          src={verifiedBankChecklist}
          alt="Compliance checklist approved beside a bank"
        />

        <section className="success-message" aria-labelledby="success-title">
          <span className="success-kicker"><CheckCircle2 size={15} aria-hidden="true" /> DEMO WORKFLOW COMPLETE</span>
          <h1 id="success-title">Document Processed Successfully</h1>
          <p>The contents have been analyzed and compliance insights are ready.</p>
        </section>

        <section className="processed-document-card" aria-label="Processed document">
          <span className="processed-file-icon" aria-hidden="true">
            <FileText size={23} />
            <small>PDF</small>
          </span>
          <span className="processed-file-info">
            <strong title={fileName}>{fileName}</strong>
            <span>{fileSize}</span>
          </span>
          <span className="processed-file-success" aria-label="Processing complete">
            <Check size={19} aria-hidden="true" />
          </span>
        </section>

        <nav className="success-actions" aria-label="Next steps">
          <button className="success-view-button" type="button" onClick={() => navigate('/compliance-analysis')}>
            View Results
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button className="success-upload-button" type="button" onClick={handleUploadAnother}>
            <Upload size={17} aria-hidden="true" />
            Upload Another
          </button>
        </nav>
        <p className="success-demo-note">
          This frontend demo does not perform backend processing or deploy changes to production.
        </p>
      </div>
      <AIChatbot />
    </main>
  )
}

export { DeploymentSuccessPage }
