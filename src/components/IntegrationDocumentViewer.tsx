import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clipboard,
  Code2,
  Database,
  Download,
  Globe,
  Landmark,
  LoaderCircle,
  Network,
  RefreshCw,
  Server,
  X,
} from 'lucide-react'
import type { IntegrationConfiguration, IntegrationType } from '../services/integrationService'
import {
  loadIntegrationDocument,
  generateComplianceAuditText,
  type IntegrationConnectionStatus,
  type IntegrationDocumentData,
} from '../services/integrationDocumentService'
import './IntegrationDocumentViewer.css'

type IntegrationRecord = IntegrationConfiguration & {
  id: string
  verificationStatus: 'not-verified'
}

type Props = {
  integration: IntegrationRecord
  onClose: () => void
}

type ViewMode = 'formatted' | 'raw'
type LoadState = 'loading' | 'loaded' | 'error'

const TYPE_ICONS: Record<IntegrationType, typeof Globe> = {
  REST: Globe,
  GraphQL: Network,
  SQL: Database,
  NoSQL: Server,
}

const RULE_SUMMARY_KEYS = new Set([
  'id',
  'ruleid',
  'title',
  'ruletitle',
  'name',
  'category',
  'description',
  'ruledescription',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getField(record: Record<string, unknown>, keys: string[]) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()))
  const match = Object.entries(record).find(([key, value]) =>
    wanted.has(key.replace(/[_\s-]/g, '').toLowerCase())
      && value !== null
      && value !== undefined
      && value !== '',
  )
  return match?.[1]
}

function formatScalar(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value)
  }
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return ''
}

function renderStructuredValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return (
      <ul className="integration-doc-list">
        {value.map((item, index) => (
          <li key={index}>{renderStructuredValue(item)}</li>
        ))}
      </ul>
    )
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).filter(([, entryValue]) =>
      entryValue !== null
      && entryValue !== undefined
      && entryValue !== ''
      && !(Array.isArray(entryValue) && entryValue.length === 0),
    )
    if (entries.length === 0) return null
    return (
      <dl className="integration-doc-nested-data">
        {entries.map(([key, entryValue]) => (
          <div key={key}>
            <dt>{formatLabel(key)}</dt>
            <dd>{renderStructuredValue(entryValue)}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return formatScalar(value)
}

function formatLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getConnectionLabel(status: IntegrationConnectionStatus) {
  if (status === 'connected') return 'Connected'
  if (status === 'disconnected') return 'Disconnected'
  return 'Pending'
}

function getIntegrationHost(integration: IntegrationRecord) {
  if (integration.integrationType === 'SQL') {
    return integration.host
      ? `${integration.host}${integration.port ? `:${integration.port}` : ''}`
      : ''
  }
  return integration.baseUrl
}

function getIntegrationCollection(integration: IntegrationRecord) {
  if (integration.integrationType === 'SQL') {
    return [integration.databaseName, integration.schema].filter(Boolean).join(' / ')
  }
  if (integration.integrationType === 'NoSQL') {
    return [integration.databaseName, integration.collection].filter(Boolean).join(' / ')
  }
  return integration.rulesEndpoint
}

function getFormattedCopy(integration: IntegrationRecord, data: IntegrationDocumentData | null, error: string) {
  const status = data?.connectionStatus ?? 'pending'
  const lines = [
    integration.integrationName,
    `Bank: ${integration.bankName} (${integration.bankIdentifier})`,
    `Integration type: ${integration.integrationType}`,
    `Environment: ${integration.targetEnvironment}`,
    `Target host: ${getIntegrationHost(integration) || 'Not provided'}`,
    `Collection / endpoint: ${getIntegrationCollection(integration) || 'Not provided'}`,
    `Connection status: ${getConnectionLabel(status)}`,
    '',
    data ? `Retrieved Compliance Rules (${data.rules.length})` : 'Retrieved Compliance Rules (not loaded)',
  ]

  if (data?.rules.length) {
    data.rules.forEach((value, index) => {
      lines.push('', `Rule #${index + 1}`)
      if (isRecord(value)) {
        Object.entries(value).forEach(([key, item]) => {
          if (item === null || item === undefined || item === '') return
          lines.push(`${formatLabel(key)}: ${JSON.stringify(item, null, 2)}`)
        })
      } else {
        lines.push(JSON.stringify(value, null, 2))
      }
    })
  } else if (error) {
    lines.push(`Rules could not be loaded: ${error}`)
  } else {
    lines.push('No compliance rules were retrieved from this integration.')
  }

  return lines.join('\n')
}

async function writeTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall back to the legacy clipboard command when browser permissions deny the API.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  let copied: boolean
  try {
    textarea.select()
    copied = document.execCommand('copy')
  } finally {
    textarea.remove()
  }
  if (!copied) throw new Error('Clipboard access is unavailable in this browser.')
}

function getAuditFileName(integration: IntegrationRecord) {
  const bankLabel = integration.bankIdentifier || integration.bankName || integration.integrationName
  const safeLabel = bankLabel
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${safeLabel || 'Integration'}_Compliance_Audit.txt`
}

function RuleCard({ rule, index }: { rule: unknown; index: number }) {
  const record = isRecord(rule) ? rule : null
  const ruleId = record ? getField(record, ['id', 'ruleId']) : undefined
  const category = record ? getField(record, ['category']) : undefined
  const title = record ? getField(record, ['title', 'ruleTitle', 'name']) : undefined
  const description = record ? getField(record, ['description', 'ruleDescription']) : undefined
  const summaryKeys = new Set(RULE_SUMMARY_KEYS)
  const details = record
    ? Object.entries(record).filter(([key, value]) =>
      !summaryKeys.has(key.replace(/[_\s-]/g, '').toLowerCase())
        && value !== null
        && value !== undefined
        && value !== ''
        && !(Array.isArray(value) && value.length === 0),
    )
    : []

  return (
    <article className="integration-doc-rule">
      <div className="integration-doc-rule-badges">
        <span className="integration-doc-rule-number">Rule #{index + 1}</span>
        {ruleId !== undefined && <span className="integration-doc-rule-id">{formatScalar(ruleId)}</span>}
        {category !== undefined && <span className="integration-doc-rule-category">{formatScalar(category)}</span>}
      </div>
      {title !== undefined && <h4>{formatScalar(title)}</h4>}
      {description !== undefined && (
        <p className="integration-doc-rule-description">{renderStructuredValue(description)}</p>
      )}
      {details.length > 0 && (
        <dl className="integration-doc-rule-details">
          {details.map(([key, value]) => (
            <div key={key}>
              <dt>{formatLabel(key)}</dt>
              <dd>{renderStructuredValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {!title && !description && details.length === 0 && record === null && (
        <div className="integration-doc-rule-raw-value">{renderStructuredValue(rule)}</div>
      )}
    </article>
  )
}

function IntegrationDocumentViewer({ integration, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('formatted')
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [documentData, setDocumentData] = useState<IntegrationDocumentData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [copyMessage, setCopyMessage] = useState('')
  const Icon = TYPE_ICONS[integration.integrationType]
  const rawDocumentText = useMemo(() => {
    if (!documentData || documentData.rules.length === 0) return ''
    if (documentData.rawContent?.trim()) return documentData.rawContent
    return generateComplianceAuditText(integration, documentData.rules, {
      connectionStatus: documentData.connectionStatus ?? 'pending',
      extractedAt: documentData.extractedAt,
      fetchLog: documentData.fetchLog,
    })
  }, [documentData, integration])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [onClose])

  useEffect(() => {
    let active = true
    void loadIntegrationDocument(integration.id)
      .then((data) => {
        if (!active) return
        setDocumentData(data)
        setLoadState('loaded')
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(error instanceof Error
          ? error.message
          : 'The integration document could not be loaded.')
        setLoadState('error')
      })

    return () => {
      active = false
    }
  }, [integration.id, retry])

  async function copyContent() {
    if (viewMode === 'raw' && !rawDocumentText) {
      setCopyMessage('No raw document content is available for this integration.')
      return
    }

    const content = viewMode === 'raw'
      ? rawDocumentText
      : getFormattedCopy(integration, documentData, loadError)
    try {
      await writeTextToClipboard(content)
      setCopyMessage('Copied successfully!')
    } catch (error: unknown) {
      setCopyMessage(error instanceof Error
        ? error.message
        : 'Clipboard access is unavailable in this browser.')
    }
  }

  function downloadRawDocument() {
    if (!rawDocumentText) return
    const url = URL.createObjectURL(new Blob([rawDocumentText], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = getAuditFileName(integration)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const connectionStatus = documentData?.connectionStatus ?? 'pending'

  return (
    <div
      className="integration-doc-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="integration-doc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="integration-doc-title"
        tabIndex={-1}
      >
        <header className="integration-doc-header">
          <span className="integration-doc-type-icon" aria-hidden="true"><Icon size={22} /></span>
          <div className="integration-doc-heading">
            <h2 id="integration-doc-title" title={documentData?.fileName ?? integration.integrationName}>
              {documentData?.fileName ?? integration.integrationName}
            </h2>
            <div className="integration-doc-meta">
              <span className="integration-doc-file-type">{documentData?.fileType ?? 'CONFIG'}</span>
              {typeof documentData?.fileSize === 'number' && (
                <span>{formatFileSize(documentData.fileSize)}</span>
              )}
              <span className={`integration-doc-status integration-doc-status--${connectionStatus}`}>
                <span aria-hidden="true" />
                {getConnectionLabel(connectionStatus)}
              </span>
            </div>
          </div>
          <button className="integration-doc-close" type="button" onClick={onClose} aria-label="Close document viewer">
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className="integration-doc-toolbar">
          <div className="integration-doc-toolbar-title">
            <Code2 size={17} aria-hidden="true" />
            <strong>{viewMode === 'formatted' ? 'Formatted Compliance Rules' : 'Raw .txt View'}</strong>
          </div>
          <div className="integration-doc-toolbar-actions">
            {viewMode === 'raw' && (
              <button
                className="integration-doc-download"
                type="button"
                onClick={downloadRawDocument}
                disabled={!rawDocumentText}
              >
                <Download size={14} aria-hidden="true" />
                Download .TXT
              </button>
            )}
            <div className="integration-doc-view-toggle" role="group" aria-label="Document view mode">
              <button
                type="button"
                className={viewMode === 'formatted' ? 'integration-doc-view-option integration-doc-view-option--active' : 'integration-doc-view-option'}
                aria-pressed={viewMode === 'formatted'}
                onClick={() => {
                  setViewMode('formatted')
                  setCopyMessage('')
                }}
              >
                Formatted
              </button>
              <button
                type="button"
                className={viewMode === 'raw' ? 'integration-doc-view-option integration-doc-view-option--active' : 'integration-doc-view-option'}
                aria-pressed={viewMode === 'raw'}
                onClick={() => {
                  setViewMode('raw')
                  setCopyMessage('')
                }}
              >
                Raw Text
              </button>
            </div>
          </div>
        </div>

        <div className="integration-doc-content" key={viewMode}>
          {viewMode === 'formatted' ? (
            <div className="integration-doc-formatted">
              <section className="integration-doc-summary">
                <div className="integration-doc-summary-heading">
                  <span className="integration-doc-summary-icon" aria-hidden="true"><Icon size={20} /></span>
                  <div>
                    <h3>{integration.integrationName}</h3>
                    <p>{integration.integrationType} · {integration.targetEnvironment}</p>
                  </div>
                </div>
                <dl className="integration-doc-summary-grid">
                  <div>
                    <dt><Landmark size={14} aria-hidden="true" /> Bank</dt>
                    <dd>{integration.bankName} <span>({integration.bankIdentifier})</span></dd>
                  </div>
                  <div>
                    <dt><Globe size={14} aria-hidden="true" /> Target Host</dt>
                    <dd title={getIntegrationHost(integration)}>{getIntegrationHost(integration) || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt><Database size={14} aria-hidden="true" /> Collection / Endpoint</dt>
                    <dd>{getIntegrationCollection(integration) || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt><CheckCircle2 size={14} aria-hidden="true" /> Status</dt>
                    <dd className={`integration-doc-status-text integration-doc-status-text--${connectionStatus}`}>
                      {getConnectionLabel(connectionStatus)}
                    </dd>
                  </div>
                </dl>
              </section>

              <div className="integration-doc-rules-heading">
                <div>
                  <h3>
                    Retrieved Compliance Rules
                    {loadState === 'loaded' && ` (${documentData?.rules.length ?? 0})`}
                  </h3>
                  <p>{integration.integrationName}</p>
                </div>
              </div>

              {loadState === 'loading' && (
                <div className="integration-doc-state" role="status">
                  <LoaderCircle className="integration-doc-spinner" size={22} aria-hidden="true" />
                  <span>Loading integration document...</span>
                </div>
              )}
              {loadState === 'error' && (
                <div className="integration-doc-error" role="alert">
                  <AlertCircle size={20} aria-hidden="true" />
                  <div>
                    <strong>Could not load integration document</strong>
                    <p>{loadError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoadState('loading')
                        setLoadError('')
                        setDocumentData(null)
                        setRetry((current) => current + 1)
                      }}
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      Retry
                    </button>
                  </div>
                </div>
              )}
              {loadState === 'loaded' && documentData?.rules.length === 0 && (
                <div className="integration-doc-empty">
                  <Database size={21} aria-hidden="true" />
                  <p>No compliance rules were retrieved from this integration.</p>
                </div>
              )}
              {loadState === 'loaded' && documentData?.rules.map((rule, index) => (
                <RuleCard key={index} rule={rule} index={index} />
              ))}
            </div>
          ) : (
            <div className="integration-doc-raw">
              {loadState === 'loading' && (
                <div className="integration-doc-state" role="status">
                  <LoaderCircle className="integration-doc-spinner" size={22} aria-hidden="true" />
                  <span>Loading integration document...</span>
                </div>
              )}
              {loadState === 'error' && (
                <div className="integration-doc-raw-state" role="alert">
                  <AlertCircle size={18} aria-hidden="true" />
                  <div>
                    <strong>No compliance rules have been retrieved from this integration yet.</strong>
                    <p>{loadError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoadState('loading')
                        setLoadError('')
                        setDocumentData(null)
                        setRetry((current) => current + 1)
                      }}
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      Retry
                    </button>
                  </div>
                </div>
              )}
              {loadState === 'loaded' && documentData?.rules.length === 0 && (
                <div className="integration-doc-raw-empty" role="status">
                  No compliance rules have been retrieved from this integration yet.
                </div>
              )}
              {loadState === 'loaded' && documentData?.rules.length > 0 && !rawDocumentText && (
                <div className="integration-doc-raw-empty" role="status">
                  No raw document content is available for this integration.
                </div>
              )}
              {loadState === 'loaded' && rawDocumentText && (
                <pre aria-label="Raw compliance audit document"><code>{rawDocumentText}</code></pre>
              )}
            </div>
          )}
        </div>

        <footer className="integration-doc-footer">
          <div className="integration-doc-copy-area">
            <button
              className="integration-doc-copy-button"
              type="button"
              onClick={() => void copyContent()}
              disabled={viewMode === 'raw' && !rawDocumentText}
            >
              {copyMessage === 'Copied successfully!'
                ? <Check size={16} aria-hidden="true" />
                : <Clipboard size={16} aria-hidden="true" />}
              {copyMessage || 'Copy Content'}
            </button>
          </div>
          <button className="integration-doc-done" type="button" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  )
}

export { IntegrationDocumentViewer }
