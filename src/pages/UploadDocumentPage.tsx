import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  CloudCheck,
  FileCheck2,
  FileText,
  Landmark,
  Link2,
  LoaderCircle,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { ConnectCIDANModal } from '../components/ConnectCIDANModal'
import { DocumentUpload } from '../components/DocumentUpload'
import { IntegrationDocumentViewer } from '../components/IntegrationDocumentViewer'
import { SelectedFileCard } from '../components/SelectedFileCard'
import { AIChatbot } from '../components/AIChatbot'
import bankingArtwork from '../assets/bank img.png'
import analysisVideo from '../assets/cidan-circular-analysis-7s.mp4'
import existingRulesStepImage from '../assets/existing_rules.png'
import newRuleStepImage from '../assets/new_rule_input.png'
import historyImage from '../assets/history.png'
import graphqlImage from '../assets/graphql.png'
import mongodbImage from '../assets/mongodb.png'
import mysqlImage from '../assets/mysql.png'
import postgresqlImage from '../assets/postgresql.png'
import redisImage from '../assets/redis.png'
import restApiImage from '../assets/rest_api.png'
import {
  getRecentRegulatoryHistory,
  recordDocumentAnalysis,
  type UserHistoryRecord,
} from '../services/userHistoryService'
import { createWorkflowId } from '../utils/workflowId'
import { saveDocumentWorkflow } from '../utils/workflowState'
import type { IntegrationConfiguration } from '../services/integrationService'
import './UploadDocumentPage.css'

type UploadStage = 'existing-rules' | 'new-rule'
type ExistingRulesTab = 'manual' | 'connect'
type LocalIntegration = IntegrationConfiguration & {
  id: string
  verificationStatus: 'not-verified'
}

const analysisStages = [
  'Uploading circular...',
  'Extracting obligations...',
  'Mapping to your existing rules...',
  'Backtesting in sandbox...',
]

const INTEGRATION_GATEWAY_SOURCES = [
  { name: 'MongoDB', image: mongodbImage },
  { name: 'PostgreSQL', image: postgresqlImage },
  { name: 'MySQL', image: mysqlImage },
  { name: 'Redis', image: redisImage },
  { name: 'GraphQL', image: graphqlImage },
  { name: 'REST API', image: restApiImage },
] as const

const INTEGRATION_IMAGES_BY_KEY: Record<string, string> = {
  postgresql: postgresqlImage,
  mysql: mysqlImage,
  mongodb: mongodbImage,
  redis: redisImage,
  graphql: graphqlImage,
  rest: restApiImage,
  sql: postgresqlImage,
  nosql: redisImage,
}

function getIntegrationImage(integration: LocalIntegration) {
  const databaseKey = integration.databaseType.trim().toLowerCase()
  if (databaseKey && INTEGRATION_IMAGES_BY_KEY[databaseKey]) {
    return INTEGRATION_IMAGES_BY_KEY[databaseKey]
  }
  return INTEGRATION_IMAGES_BY_KEY[integration.integrationType.toLowerCase()] ?? restApiImage
}

function getIntegrationEngineLabel(integration: LocalIntegration) {
  if (integration.integrationType === 'SQL' || integration.integrationType === 'NoSQL') {
    return (integration.databaseType || integration.integrationType).toUpperCase()
  }
  return integration.integrationType === 'GraphQL' ? 'GRAPHQL_API' : 'REST_API'
}

const HISTORY_ACTION_LABELS: Record<string, { label: string; tone: string }> = {
  document_analysis_completed: { label: 'Document Analysis', tone: 'analysis' },
  demo_deployment_completed: { label: 'Workflow Completed', tone: 'deployment' },
  login_success: { label: 'Session Sign-In', tone: 'login' },
}

function formatHistoryTimestamp(value: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function getIntegrationLocation(integration: LocalIntegration) {
  if (integration.integrationType === 'SQL') {
    return `${integration.host}:${integration.port}/${integration.databaseName}`
  }
  if (integration.integrationType === 'NoSQL') {
    return `${integration.baseUrl}/${integration.databaseName}/${integration.collection}`
  }
  return `${integration.baseUrl}${integration.rulesEndpoint}`
}

function UploadDocumentPage() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<UploadStage>('existing-rules')
  const [existingRulesReady, setExistingRulesReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStageIndex, setAnalysisStageIndex] = useState<number | null>(0)
  const [analysisVideoError, setAnalysisVideoError] = useState(false)
  const [existingRules, setExistingRules] = useState<File[]>([])
  const [newRule, setNewRule] = useState<File[]>([])
  const [existingRulesTab, setExistingRulesTab] = useState<ExistingRulesTab>('manual')
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [activeIntegrationId, setActiveIntegrationId] = useState('')
  const [editingIntegration, setEditingIntegration] = useState<LocalIntegration | null>(null)
  const [savedIntegrations, setSavedIntegrations] = useState<LocalIntegration[]>([])
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null)
  const [viewingIntegration, setViewingIntegration] = useState<LocalIntegration | null>(null)
  const [integrationNotice, setIntegrationNotice] = useState('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<UserHistoryRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const isExistingRulesStage = stage === 'existing-rules'
  const newRuleReady = existingRulesReady && newRule.length > 0
  const currentFiles = isExistingRulesStage ? existingRules : newRule
  const selectedIntegration = savedIntegrations.find((integration) => integration.id === selectedIntegrationId)
  const closeConnectModal = useCallback(() => setIsConnectModalOpen(false), [])
  const closeIntegrationViewer = useCallback(() => setViewingIntegration(null), [])
  const closeHistoryModal = useCallback(() => setIsHistoryOpen(false), [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const records = await getRecentRegulatoryHistory()
      setHistoryItems(records)
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : 'Could not load recent regulatory history.',
      )
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  function openHistoryModal() {
    setIsHistoryOpen(true)
    void loadHistory()
  }

  useEffect(() => {
    if (!isHistoryOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsHistoryOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isHistoryOpen])

  function openNewIntegrationModal() {
    setEditingIntegration(null)
    setActiveIntegrationId(createWorkflowId())
    setIsConnectModalOpen(true)
  }

  function editIntegration(integration: LocalIntegration) {
    setEditingIntegration(integration)
    setActiveIntegrationId(integration.id)
    setIsConnectModalOpen(true)
  }

  function addLocalIntegrationDraft(configuration: IntegrationConfiguration) {
    const draft: LocalIntegration = {
      ...configuration,
      id: activeIntegrationId || createWorkflowId(),
      verificationStatus: 'not-verified',
    }
    setSavedIntegrations((current) => {
      const existingIndex = current.findIndex((integration) => integration.id === draft.id)
      if (existingIndex < 0) return [...current, draft]
      return current.map((integration) => integration.id === draft.id ? draft : integration)
    })
    setSelectedIntegrationId(draft.id)
    setIntegrationNotice(
      'Configuration is shown in this browser session only. It has not been verified or saved to the backend.',
    )
  }

  function removeLocalIntegration(id: string) {
    setSavedIntegrations((current) => current.filter((integration) => integration.id !== id))
    setSelectedIntegrationId((current) => current === id ? null : current)
    setViewingIntegration((current) => current?.id === id ? null : current)
  }

  function continueToNewRule() {
    if (existingRules.length === 0) return
    setExistingRulesReady(true)
    setStage('new-rule')
  }

  function navigateToAnalysis() {
    const file = newRule[0]
    const workflowId = createWorkflowId()
    saveDocumentWorkflow({
      fileName: file.name,
      fileSize: file.size,
      workflowId,
      status: 'analysis-complete',
    })
    void recordDocumentAnalysis({
      documentName: file.name,
      workflowId,
      fileSize: file.size,
    }).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : 'Unexpected history error.'
      console.error('[History] Could not record document analysis:', detail)
    })

    navigate('/compliance-analysis', {
      state: {
        fileName: file.name,
        existingRuleNames: existingRules.map((item) => item.name),
        localPreview: true,
      },
    })
  }

  function handleAnalyze() {
    if (!existingRulesReady || !newRuleReady || newRule.length === 0) return

    setAnalysisStageIndex(0)
    setAnalysisVideoError(false)
    setIsAnalyzing(true)
  }

  useEffect(() => {
    if (!isAnalyzing || analysisVideoError) return

    const intervalId = window.setInterval(() => {
      setAnalysisStageIndex((current) => {
        if (current === null || current === analysisStages.length - 1) return null
        return current + 1
      })
    }, 1500)

    return () => window.clearInterval(intervalId)
  }, [isAnalyzing, analysisVideoError])

  return (
    <main className="upload-page">
      <Header onHistoryClick={openHistoryModal} historyOpen={isHistoryOpen} />
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
              <li><Zap size={15} aria-hidden="true" /><span>Guided Workflow</span></li>
              <li><FileCheck2 size={15} aria-hidden="true" /><span>Policy Compliant</span></li>
            </ul>
          </div>
        </section>

        <div className="upload-workflow">
          <ol className="upload-progress" aria-label="Upload progress">
            <li className={`upload-progress-step${isExistingRulesStage && !existingRulesReady ? ' upload-progress-step--active' : ''}${existingRulesReady ? ' upload-progress-step--complete' : ''}`} aria-current={isExistingRulesStage && !existingRulesReady ? 'step' : undefined}>
              <img className="upload-progress-icon" src={existingRulesStepImage} alt="" aria-hidden="true" />
              <span>Step 1: Upload Existing Rules</span>
            </li>
            <li className={`upload-progress-step${!isExistingRulesStage && !newRuleReady ? ' upload-progress-step--active' : ''}${newRuleReady ? ' upload-progress-step--complete' : ''}`} aria-current={!isExistingRulesStage && !newRuleReady ? 'step' : undefined}>
              <img className="upload-progress-icon" src={newRuleStepImage} alt="" aria-hidden="true" />
              <span>Step 2: Upload New Circular</span>
            </li>
            <li className={`upload-progress-step${newRuleReady ? ' upload-progress-step--active' : ''}`}>
              <span>Step 3: Analyze</span>
            </li>
          </ol>

          <section className="upload-main" aria-label="Document upload" key={stage}>
            <div className="upload-stage-heading">
              <span className="upload-stage-label">STEP {isExistingRulesStage ? '1' : '2'} OF 3</span>
              <h2>{isExistingRulesStage ? 'Existing Rules' : 'New Rule Input (Circular / Update)'}</h2>
              {isExistingRulesStage && existingRules.length > 0 && (
                <span className="upload-file-count">
                  <Check size={13} aria-hidden="true" />
                  {existingRules.length} {existingRules.length === 1 ? 'file' : 'files'}
                </span>
              )}
              <p>
                {isExistingRulesStage
                  ? 'Upload internal policies or connect via CIDAN gateway'
                  : 'Upload new regulatory circulars, notices, or amendments'}
              </p>
            </div>
            {isExistingRulesStage && (
              <div className="existing-rules-tabs" role="tablist" aria-label="Existing Rules source">
                <button
                  id="existing-rules-manual-tab"
                  className={`existing-rules-tab${existingRulesTab === 'manual' ? ' existing-rules-tab--active' : ''}`}
                  type="button"
                  role="tab"
                  aria-selected={existingRulesTab === 'manual'}
                  aria-controls="existing-rules-manual-panel"
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                    event.preventDefault()
                    setExistingRulesTab('connect')
                    document.getElementById('existing-rules-connect-tab')?.focus()
                  }}
                  onClick={() => {
                    setExistingRulesTab('manual')
                  }}
                >
                  <Upload size={15} aria-hidden="true" />
                  Upload Rules
                </button>
                <button
                  id="existing-rules-connect-tab"
                  className={`existing-rules-tab${existingRulesTab === 'connect' ? ' existing-rules-tab--active' : ''}`}
                  type="button"
                  role="tab"
                  aria-selected={existingRulesTab === 'connect'}
                  aria-controls="existing-rules-connect-panel"
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                    event.preventDefault()
                    setExistingRulesTab('manual')
                    document.getElementById('existing-rules-manual-tab')?.focus()
                  }}
                  onClick={() => {
                    setExistingRulesTab('connect')
                  }}
                >
                  <Landmark size={15} aria-hidden="true" />
                  Connect CIDAN
                </button>
              </div>
            )}

            {isExistingRulesStage && existingRulesTab === 'connect' ? (
              <div
                className="integration-gateway"
                id="existing-rules-connect-panel"
                role="tabpanel"
                aria-labelledby="existing-rules-connect-tab"
              >
                <div className="integration-gateway-heading">
                  <span className="integration-gateway-icon" aria-hidden="true">
                    <Landmark size={20} />
                  </span>
                  <div className="integration-gateway-copy">
                    <h3>Enterprise Integration Gateway</h3>
                    <p>Connect to PostgreSQL, MySQL, MongoDB, or APIs via CIDAN gateway</p>
                    <div className="integration-source-list" role="list" aria-label="Supported source types">
                      {INTEGRATION_GATEWAY_SOURCES.map(({ name, image }) => (
                        <img
                          key={name}
                          className="integration-source-icon"
                          src={image}
                          alt={name}
                          title={name}
                          role="listitem"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <button className="integration-connect-button" type="button" onClick={openNewIntegrationModal}>
                  <Link2 size={16} aria-hidden="true" />
                  Connect New Integration Source
                </button>
                {savedIntegrations.length > 0 && (
                  <section className="saved-integrations" aria-labelledby="saved-integrations-title">
                    <div className="saved-integrations-heading">
                      <h4 id="saved-integrations-title">
                        <CloudCheck size={16} aria-hidden="true" />
                        Saved Cloud Integrations ({savedIntegrations.length})
                      </h4>
                      <span className="saved-integrations-local-badge">THIS SESSION</span>
                    </div>
                    {integrationNotice && <p className="saved-integrations-notice" role="status">{integrationNotice}</p>}
                    <div className="saved-integrations-list">
                      {savedIntegrations.map((integration) => {
                        const selected = selectedIntegrationId === integration.id
                        return (
                          <article
                            key={integration.id}
                            className={`saved-integration-card${selected ? ' saved-integration-card--selected' : ''}`}
                          >
                            <button
                              className="saved-integration-select"
                              type="button"
                              aria-label={`Select ${integration.integrationName}`}
                              aria-pressed={selected}
                              onClick={() => setSelectedIntegrationId(integration.id)}
                            >
                              {selected
                                ? <CheckCircle2 size={17} aria-hidden="true" />
                                : <Circle size={17} aria-hidden="true" />}
                            </button>
                            <img
                              className="saved-integration-icon"
                              src={getIntegrationImage(integration)}
                              alt=""
                              aria-hidden="true"
                            />
                            <div className="saved-integration-main">
                              <div className="saved-integration-topline">
                                <span className="saved-integration-engine">{getIntegrationEngineLabel(integration)}</span>
                                <span className="saved-integration-status">Not verified</span>
                              </div>
                              <strong className="saved-integration-name" title={integration.integrationName}>
                                {integration.integrationName}
                              </strong>
                              <span className="saved-integration-bank" title={integration.bankName}>
                                {integration.bankName} · {integration.targetEnvironment}
                              </span>
                              <span className="saved-integration-location" title={getIntegrationLocation(integration)}>
                                {getIntegrationLocation(integration)}
                              </span>
                            </div>
                            <div className="saved-integration-actions">
                              <button
                                type="button"
                                aria-label={`View ${integration.integrationName} document`}
                                title="View integration document"
                                onClick={() => setViewingIntegration(integration)}
                              >
                                <FileText size={15} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Edit ${integration.integrationName}`}
                                title="Edit integration"
                                onClick={() => editIntegration(integration)}
                              >
                                <Pencil size={15} aria-hidden="true" />
                              </button>
                              <button
                                className="saved-integration-delete"
                                type="button"
                                aria-label={`Remove ${integration.integrationName}`}
                                title="Remove integration"
                                onClick={() => removeLocalIntegration(integration.id)}
                              >
                                <Trash2 size={15} aria-hidden="true" />
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div
                id={isExistingRulesStage ? 'existing-rules-manual-panel' : undefined}
                role={isExistingRulesStage ? 'tabpanel' : undefined}
                aria-labelledby={isExistingRulesStage ? 'existing-rules-manual-tab' : undefined}
              >
                <DocumentUpload
                  multiple={isExistingRulesStage}
                  selectedFiles={currentFiles}
                  onFilesSelected={(files) => {
                    if (isExistingRulesStage) {
                      setExistingRules(files)
                      setExistingRulesReady(false)
                    } else {
                      setNewRule(files)
                    }
                  }}
                />

                {currentFiles.map((file) => (
                  <SelectedFileCard
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    file={file}
                    status="Selected for this session"
                    onRemove={() => {
                      if (isExistingRulesStage) {
                        setExistingRules((current) => current.filter((item) => item !== file))
                        setExistingRulesReady(false)
                      } else {
                        setNewRule([])
                      }
                    }}
                  />
                ))}

                {isExistingRulesStage && existingRules.length > 0 && (
                  <button className="upload-process-button" type="button" onClick={continueToNewRule}>
                    Continue to New Rule Input
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {!isExistingRulesStage && existingRules.length > 0 && (
              <button
                className="upload-back-button"
                type="button"
                onClick={() => {
                  setExistingRulesReady(false)
                  setStage('existing-rules')
                }}
              >
                Change Existing Rules
              </button>
            )}

            <button
              className="analyze-generate-button"
              type="button"
              onClick={handleAnalyze}
              disabled={!existingRulesReady || !newRuleReady}
            >
              Analyze &amp; Generate
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <div className="upload-status">
              <p className="upload-integration-note">
                Files are held in this browser session only. They are not saved to the database or analyzed by the backend yet.
              </p>
            </div>
          </section>
        </div>
      </div>
      <AIChatbot
        activeContext={selectedIntegration
          ? { label: selectedIntegration.integrationName, status: 'pending' }
          : undefined}
      />
      {isHistoryOpen && (
        <div
          className="history-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeHistoryModal()
          }}
        >
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="regulatory-history-title"
          >
            <header className="history-modal-header">
              <span className="history-modal-icon" aria-hidden="true">
                <img src={historyImage} alt="" />
              </span>
              <div className="history-modal-heading">
                <span className="upload-stage-label">ACTIVITY</span>
                <h2 id="regulatory-history-title">Recent Regulatory History</h2>
              </div>
              <button
                className="history-modal-refresh"
                type="button"
                onClick={() => void loadHistory()}
                disabled={historyLoading}
                aria-label="Refresh history"
                title="Refresh history"
              >
                <RefreshCw className={historyLoading ? 'upload-spinner' : undefined} size={16} aria-hidden="true" />
              </button>
              <button
                className="history-modal-close"
                type="button"
                onClick={closeHistoryModal}
                aria-label="Close Recent Regulatory History"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="history-modal-body">
              {historyLoading ? (
                <p className="history-modal-state" role="status">
                  <LoaderCircle className="upload-spinner" size={18} aria-hidden="true" />
                  Loading recent regulatory history…
                </p>
              ) : historyError ? (
                <div className="history-modal-error" role="alert">
                  <p>{historyError}</p>
                  <button className="history-retry-button" type="button" onClick={() => void loadHistory()}>
                    Retry
                  </button>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="history-modal-empty">
                  <img src={historyImage} alt="" aria-hidden="true" />
                  <p>No regulatory history recorded yet. Upload and analyze a document to see recent activity here.</p>
                </div>
              ) : (
                <ul className="history-modal-list">
                  {historyItems.map((item) => {
                    const actionMeta = HISTORY_ACTION_LABELS[item.action_type] ?? {
                      label: item.action_type.replace(/_/g, ' '),
                      tone: 'default',
                    }
                    const formattedDate = formatHistoryTimestamp(item.created_at)
                    return (
                      <li key={item.id} className="history-modal-item">
                        <div className="history-modal-item-top">
                          <span className={`history-action-badge history-action-badge--${actionMeta.tone}`}>
                            {actionMeta.label}
                          </span>
                          {formattedDate && (
                            <span className="history-item-time">
                              <Clock3 size={12} aria-hidden="true" />
                              {formattedDate}
                            </span>
                          )}
                        </div>
                        <strong className="history-item-title">
                          {item.document_name || item.summary || actionMeta.label}
                        </strong>
                        {item.document_name && item.summary && (
                          <p className="history-item-summary">{item.summary}</p>
                        )}
                        {item.workflow_id && (
                          <span className="history-item-workflow">Workflow: {item.workflow_id}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
      {isConnectModalOpen && (
        <ConnectCIDANModal
          key={activeIntegrationId}
          initialConfiguration={editingIntegration ?? undefined}
          onClose={closeConnectModal}
          onDraftSave={addLocalIntegrationDraft}
        />
      )}
      {viewingIntegration && (
        <IntegrationDocumentViewer
          integration={viewingIntegration}
          onClose={closeIntegrationViewer}
        />
      )}
      {isAnalyzing && (
        <section className="upload-main analysis-progress" aria-label="Analyzing circular">
          <div className="analysis-video">
            <video
              className="analysis-video-player"
              autoPlay
              muted
              playsInline
              onEnded={navigateToAnalysis}
              onError={() => {
                console.error('[Analysis] Could not play the circular analysis video.')
                setAnalysisVideoError(true)
              }}
            >
              <source src={analysisVideo} type="video/mp4" />
            </video>
          </div>
          {!analysisVideoError ? (
            <>
              {analysisStageIndex !== null && (
                <p className="analysis-video-status" role="status" aria-live="polite">
                  <LoaderCircle className="analysis-status-spinner" size={24} aria-hidden="true" />
                  {analysisStages[analysisStageIndex]}
                </p>
              )}
              <p className="analysis-file-name">
                <FileText size={16} aria-hidden="true" />
                {newRule[0].name}
              </p>
            </>
          ) : (
            <div className="analysis-video-error" role="alert">
              <p>The analysis video could not be played.</p>
              <button className="upload-process-button" type="button" onClick={navigateToAnalysis}>
                Continue to analysis
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

export { UploadDocumentPage }
