import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileCheck2,
  FileText,
  GitCompareArrows,
  LoaderCircle,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import { complianceRisks, policyComparison, testCases, type ComplianceRisk, type TestCase } from '../data/complianceAnalysis'
import { AIChatbot } from '../components/AIChatbot'
import { Header } from '../components/Header'
import { PDFReportPreview } from '../components/PDFReportPreview'
import { recordDemoDeployment } from '../services/userHistoryService'
import { createWorkflowId } from '../utils/workflowId'
import { getDocumentWorkflow, updateWorkflowStatus } from '../utils/workflowState'
import './ComplianceAnalysisPage.css'

type DetailSelection = { type: 'test'; id: string } | { type: 'risk'; id: string } | null
type NavigationState = {
  fileName?: string
  existingRuleNames?: string[]
  localPreview?: boolean
}

function ComplianceAnalysisPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const workflow = getDocumentWorkflow()
  const navigationState = location.state && typeof location.state === 'object'
    ? location.state as NavigationState
    : null
  const fileName = navigationState?.fileName || workflow?.fileName || 'Uploaded document'
  const [workflowId] = useState(() => workflow?.workflowId || createWorkflowId())
  const [detail, setDetail] = useState<DetailSelection>(null)
  const [showDeploymentModal, setShowDeploymentModal] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState('')
  const [generatedReport, setGeneratedReport] = useState<{
    blob: Blob
    reportId: string
  } | null>(null)

  const closeReportPreview = useCallback(() => {
    setGeneratedReport(null)
  }, [])

  function toggleDetail(next: Exclude<DetailSelection, null>) {
    setDetail((current) => current?.type === next.type && current.id === next.id ? null : next)
  }

  function handleBack() {
    navigate('/upload-document')
  }

  function handleConfirmDemoDeployment() {
    if (isDeploying) return
    setIsDeploying(true)
    updateWorkflowStatus('demo-deployment-complete')
    window.setTimeout(() => {
      void recordDemoDeployment({ documentName: fileName, workflowId }).catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : 'Unexpected history error.'
        console.error('[History] Could not record demo workflow completion:', detail)
      })
      navigate('/deployment-success')
    }, 650)
  }

  async function handleGenerateReport() {
    if (isGeneratingReport) return

    setIsGeneratingReport(true)
    setReportError('')
    try {
      const { createComplianceReportId, generateComplianceReport } = await import('../services/pdfReportService')
      const reportId = createComplianceReportId()
      const blob = generateComplianceReport({
        fileName,
        workflowId,
        generatedAt: new Date(),
        reportId,
      })
      if (blob.size === 0) throw new Error('The generated report is empty.')
      setGeneratedReport({ blob, reportId })
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'The compliance report could not be generated.')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  return (
    <main className="compliance-page">
      <Header />

      <div className="compliance-content">
        <div className="compliance-page-heading">
          <button className="compliance-back" type="button" onClick={handleBack} aria-label="Back to document upload">
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
          <div className="compliance-header-title">
            <h1>Compliance Analysis</h1>
            <p>Audit &amp; Verification Dashboard</p>
          </div>
        </div>
        <div className="compliance-demo-banner" role="note">
          <span className="compliance-demo-dot" />
          {navigationState?.localPreview
            ? 'Sample demonstration analysis · Local file selection only'
            : 'Sample demonstration analysis'}
          <span className="compliance-document-name" title={fileName}>
            <FileText size={14} aria-hidden="true" />
            {fileName}
          </span>
        </div>
        {navigationState?.localPreview && navigationState.existingRuleNames?.length ? (
          <p className="compliance-local-inputs">
            Existing Rules selected for this preview: {navigationState.existingRuleNames.join(', ')}
          </p>
        ) : null}

        <section className="compliance-section" aria-labelledby="policy-title">
          <div className="compliance-section-heading">
            <span className="compliance-section-icon"><GitCompareArrows size={21} aria-hidden="true" /></span>
            <div className="compliance-section-heading-copy">
              <h2 id="policy-title">Policy Evolution &amp; Gap Comparison</h2>
              <p>Compare existing handbook rules with new circular requirements.</p>
            </div>
          </div>
          <div className="policy-comparison">
            <RuleCard variant="old" {...policyComparison.oldRule} />
            <span className="policy-connector" aria-hidden="true"><ArrowDown size={18} /></span>
            <RuleCard variant="new" {...policyComparison.newRule} />
          </div>
        </section>

        <section className="compliance-section" aria-labelledby="tests-title">
          <div className="compliance-section-heading">
            <span className="compliance-section-icon"><ListChecks size={21} aria-hidden="true" /></span>
            <div className="compliance-section-heading-copy">
              <h2 id="tests-title">Test Cases Performed to Verify</h2>
              <p>Validate rule changes and compliance impact.</p>
            </div>
            <span className="compliance-count-badge">4 Tests</span>
          </div>
          <div className="compliance-item-list">
            {testCases.map((test) => (
              <TestCaseCard
                key={test.id}
                test={test}
                expanded={detail?.type === 'test' && detail.id === test.id}
                onClick={() => toggleDetail({ type: 'test', id: test.id })}
              />
            ))}
          </div>
        </section>

        <section className="compliance-section" aria-labelledby="risks-title">
          <div className="compliance-section-heading">
            <span className="compliance-section-icon"><AlertTriangle size={21} aria-hidden="true" /></span>
            <div className="compliance-section-heading-copy">
              <h2 id="risks-title">Problems &amp; Risks Identified</h2>
              <p>Key issues requiring attention before deployment.</p>
            </div>
            <span className="compliance-count-badge">3 Issues</span>
          </div>
          <div className="compliance-item-list">
            {complianceRisks.map((risk) => (
              <RiskCard
                key={risk.id}
                risk={risk}
                expanded={detail?.type === 'risk' && detail.id === risk.id}
                onClick={() => toggleDetail({ type: 'risk', id: risk.id })}
              />
            ))}
          </div>
        </section>
      </div>

      <nav className="compliance-action-bar" aria-label="Analysis actions">
        <div className="compliance-action-bar-inner">
          <button className="compliance-report-button" type="button" onClick={handleGenerateReport} disabled={isGeneratingReport}>
            <FileText size={18} aria-hidden="true" />
            {isGeneratingReport ? 'Generating...' : 'PDF Report'}
          </button>
          <button className="compliance-deploy-button" type="button" onClick={() => setShowDeploymentModal(true)} disabled={isDeploying}>
            <CircleCheck size={18} aria-hidden="true" />
            Deploy
          </button>
        </div>
      </nav>

      {reportError && <p className="compliance-report-error" role="alert">{reportError}</p>}
      {generatedReport && (
        <PDFReportPreview
          blob={generatedReport.blob}
          reportId={generatedReport.reportId}
          onClose={closeReportPreview}
        />
      )}
      <AIChatbot activeContext={{ label: `Current Circular: ${fileName}`, status: 'pending' }} />
      {showDeploymentModal && (
        <DeploymentModal
          isDeploying={isDeploying}
          onClose={() => setShowDeploymentModal(false)}
          onConfirm={handleConfirmDemoDeployment}
        />
      )}
    </main>
  )
}

type RuleCardProps = {
  variant: 'old' | 'new'
  label: string
  badge: string
  title: string
  description: string
}

function RuleCard({ variant, label, badge, title, description }: RuleCardProps) {
  const Icon = variant === 'old' ? Clock3 : FileCheck2
  return (
    <article className={`rule-card rule-card--${variant}`}>
      <div className="rule-card-topline">
        <span className="rule-card-icon"><Icon size={18} aria-hidden="true" /></span>
        <span className="rule-card-label">{label}</span>
        <span className="rule-card-badge">{badge}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

function TestCaseCard({ test, expanded, onClick }: { test: TestCase; expanded: boolean; onClick: () => void }) {
  const needsReview = test.status === 'NEEDS REVIEW'
  return (
    <article className={`analysis-item${expanded ? ' analysis-item--expanded' : ''}`}>
      <button className="analysis-item-button" type="button" onClick={onClick} aria-expanded={expanded}>
        <span className={`analysis-item-icon${needsReview ? ' analysis-item-icon--review' : ' analysis-item-icon--pass'}`}>
          {needsReview ? <AlertTriangle size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
        </span>
        <span className="analysis-item-copy">
          <span className="analysis-item-title">{test.id} · {test.title}</span>
          <span className="analysis-item-description">{test.description}</span>
        </span>
        <span className={`analysis-status-badge${needsReview ? ' analysis-status-badge--review' : ''}`}>{test.status}</span>
        {expanded ? <ChevronDown className="analysis-item-chevron" size={18} aria-hidden="true" /> : <ChevronRight className="analysis-item-chevron" size={18} aria-hidden="true" />}
      </button>
      {expanded && (
        <div className="analysis-item-details">
          <DetailRow label="Test case ID" value={test.id} />
          <DetailRow label="Observation" value={test.observation} />
          <DetailRow label="Validation" value={test.validation} />
          <DetailRow label="Status" value={test.status} />
        </div>
      )}
    </article>
  )
}

function RiskCard({ risk, expanded, onClick }: { risk: ComplianceRisk; expanded: boolean; onClick: () => void }) {
  const Icon = risk.severity === 'amber' ? Clock3 : risk.severity === 'red' ? ShieldAlert : ShieldCheck
  return (
    <article className={`analysis-item risk-item risk-item--${risk.severity}${expanded ? ' analysis-item--expanded' : ''}`}>
      <button className="analysis-item-button" type="button" onClick={onClick} aria-expanded={expanded}>
        <span className={`risk-item-icon risk-item-icon--${risk.severity}`}><Icon size={18} aria-hidden="true" /></span>
        <span className="analysis-item-copy">
          <span className={`risk-category risk-category--${risk.severity}`}>{risk.category}</span>
          <span className="analysis-item-title">{risk.title}</span>
          <span className="analysis-item-description">{risk.description}</span>
        </span>
        {expanded ? <ChevronDown className="analysis-item-chevron" size={18} aria-hidden="true" /> : <ChevronRight className="analysis-item-chevron" size={18} aria-hidden="true" />}
      </button>
      {expanded && (
        <div className="analysis-item-details">
          <DetailRow label="Why this matters" value={risk.whyItMatters} />
          <DetailRow label="Recommended action" value={risk.recommendation} />
          <DetailRow label="Responsible review" value={risk.owner} />
          <DetailRow label="Review status" value="Open — human review required" />
        </div>
      )}
    </article>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="analysis-detail-row">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  )
}

function DeploymentModal({
  isDeploying,
  onClose,
  onConfirm,
}: {
  isDeploying: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="deployment-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="deployment-dialog" role="dialog" aria-modal="true" aria-labelledby="deployment-title">
        <button className="deployment-close" type="button" onClick={onClose} aria-label="Close deployment summary">
          <X size={19} aria-hidden="true" />
        </button>
        <span className="deployment-icon"><ShieldAlert size={23} aria-hidden="true" /></span>
        <h2 id="deployment-title">Confirm demo workflow</h2>
        <p className="deployment-intro">
          Continue to the success page for this frontend demonstration. This does not deploy changes to a production system.
        </p>
        <div className="deployment-summary">
          <h3>Deployment summary</h3>
          <p><FileCheck2 size={16} aria-hidden="true" /> 1 proposed policy change</p>
          <p><AlertTriangle size={16} aria-hidden="true" /> 3 identified risks requiring review</p>
        </div>
        <div className="deployment-warning">
          <strong>Approval gate</strong>
          <span>Legal and Compliance review, including confirmation of the source language, is mandatory.</span>
        </div>
        <div className="deployment-actions">
          <button className="deployment-secondary" type="button" onClick={onClose}>Close</button>
          <button className="deployment-confirm" type="button" onClick={onConfirm} disabled={isDeploying}>
            {isDeploying ? <LoaderCircle className="deployment-spinner" size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
            {isDeploying ? 'Completing...' : 'Continue demo flow'}
          </button>
        </div>
        <p className="deployment-prototype-note">No production deployment will be performed. Analysis findings remain subject to human review.</p>
      </section>
    </div>
  )
}

export { ComplianceAnalysisPage }
