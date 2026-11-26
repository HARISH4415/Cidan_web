import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Braces,
  ChevronDown,
  Code2,
  Landmark,
  LoaderCircle,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react'
import {
  IntegrationVerificationUnavailableError,
  verifyIntegrationConfiguration,
  type IntegrationConfiguration,
  type IntegrationType,
} from '../services/integrationService'
import graphqlImage from '../assets/graphql.png'
import mongodbImage from '../assets/mongodb.png'
import mysqlImage from '../assets/mysql.png'
import postgresSqlImage from '../assets/postgresSql.png'
import postgresqlImage from '../assets/postgresql.png'
import redisImage from '../assets/redis.png'
import restApiImage from '../assets/rest_api.png'
import './ConnectCIDANModal.css'

type Props = {
  onClose: () => void
  onDraftSave: (configuration: IntegrationConfiguration) => void
  initialConfiguration?: IntegrationConfiguration
}

type FormValues = Omit<IntegrationConfiguration, 'customHeaders'>
type FormField = keyof FormValues
type FieldErrors = Partial<Record<FormField | 'customHeaders', string>>

const ENGINE_BY_TYPE: Record<IntegrationType, string> = {
  REST: 'REST_API',
  GraphQL: 'GRAPHQL_API',
  SQL: 'SQL_DATABASE',
  NoSQL: 'NOSQL_DATABASE',
}

const DATABASE_TYPE_IMAGES: Record<string, string> = {
  PostgreSQL: postgresqlImage,
  MySQL: mysqlImage,
  MongoDB: mongodbImage,
}

const INITIAL_VALUES: FormValues = {
  bankName: '',
  bankIdentifier: '',
  integrationName: '',
  targetEnvironment: '',
  integrationType: 'REST',
  baseUrl: '',
  rulesEndpoint: '',
  httpMethod: 'GET',
  authenticationType: 'Bearer Token',
  credentialReference: '',
  databaseType: '',
  host: '',
  port: '',
  databaseName: '',
  schema: '',
  connectionReference: '',
  collection: '',
}

const CREDENTIAL_REFERENCE_PATTERN =
  /^(vault|secret|aws-secretsmanager|gcp-secret|azure-keyvault):\/\/[A-Za-z0-9._/-]+$/i
const SENSITIVE_KEY_PATTERN =
  /(password|passwd|authorization|client[_-]?secret|access[_-]?token|api[_-]?key|secret(?!reference)|token(?!reference))/i
const SENSITIVE_HEADER_PATTERN = /(authorization|cookie|password|token|secret|api[-_]?key)/i

const FIELD_ALIASES: Record<string, FormField> = {
  bankName: 'bankName',
  bank_name: 'bankName',
  bankIdentifier: 'bankIdentifier',
  bank_identifier: 'bankIdentifier',
  bankCode: 'bankIdentifier',
  bank_code: 'bankIdentifier',
  integrationName: 'integrationName',
  integration_name: 'integrationName',
  targetEnvironment: 'targetEnvironment',
  target_environment: 'targetEnvironment',
  environment: 'targetEnvironment',
  integrationType: 'integrationType',
  integration_type: 'integrationType',
  sourceType: 'integrationType',
  source_type: 'integrationType',
  type: 'integrationType',
  baseUrl: 'baseUrl',
  base_url: 'baseUrl',
  url: 'baseUrl',
  rulesEndpoint: 'rulesEndpoint',
  rules_endpoint: 'rulesEndpoint',
  endpoint: 'rulesEndpoint',
  path: 'rulesEndpoint',
  graphqlEndpoint: 'rulesEndpoint',
  graphql_endpoint: 'rulesEndpoint',
  httpMethod: 'httpMethod',
  http_method: 'httpMethod',
  method: 'httpMethod',
  authenticationType: 'authenticationType',
  authentication_type: 'authenticationType',
  authType: 'authenticationType',
  auth_type: 'authenticationType',
  credentialReference: 'credentialReference',
  credential_reference: 'credentialReference',
  secureCredentialReference: 'credentialReference',
  secure_credential_reference: 'credentialReference',
  databaseType: 'databaseType',
  database_type: 'databaseType',
  dbType: 'databaseType',
  db_type: 'databaseType',
  engine: 'databaseType',
  host: 'host',
  port: 'port',
  databaseName: 'databaseName',
  database_name: 'databaseName',
  dbName: 'databaseName',
  db_name: 'databaseName',
  database: 'databaseName',
  schema: 'schema',
  connectionReference: 'connectionReference',
  connection_reference: 'connectionReference',
  connectionEndpoint: 'baseUrl',
  connection_endpoint: 'baseUrl',
  collection: 'collection',
  env: 'targetEnvironment',
}

const ENVIRONMENTS = ['Development', 'UAT (Staging)', 'Production']
const HTTP_METHODS = ['GET', 'POST']
const PUBLIC_AUTHENTICATION_TYPE = 'None (Public/mTLS)'
const AUTHENTICATION_TYPES = [
  'Bearer Token',
  'API Key Header',
  'OAuth 2.0 mTLS',
  PUBLIC_AUTHENTICATION_TYPE,
]

const ENVIRONMENT_ALIASES: Record<string, string> = {
  development: 'Development',
  dev: 'Development',
  staging: 'UAT (Staging)',
  uat: 'UAT (Staging)',
  'uat (staging)': 'UAT (Staging)',
  production: 'Production',
  prod: 'Production',
}

const AUTHENTICATION_ALIASES: Record<string, string> = {
  'bearer token': 'Bearer Token',
  bearer: 'Bearer Token',
  'api key header': 'API Key Header',
  'api key': 'API Key Header',
  'oauth 2.0 mtls': 'OAuth 2.0 mTLS',
  'oauth 2.0': 'OAuth 2.0 mTLS',
  oauth2: 'OAuth 2.0 mTLS',
  'none (public/mtls)': PUBLIC_AUTHENTICATION_TYPE,
  none: PUBLIC_AUTHENTICATION_TYPE,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function containsSecretKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecretKey)
  if (!isRecord(value)) return false

  return Object.entries(value).some(([key, child]) =>
    SENSITIVE_KEY_PATTERN.test(key) || containsSecretKey(child),
  )
}

function parseHeaders(value: unknown): Record<string, string> {
  if (!isRecord(value)) throw new Error('Custom headers must be a JSON object.')

  const headers: Record<string, string> = {}
  for (const [name, headerValue] of Object.entries(value)) {
    if (!name.trim() || typeof headerValue !== 'string') {
      throw new Error('Each custom header must have a name and a string value.')
    }
    if (SENSITIVE_HEADER_PATTERN.test(name)) {
      throw new Error('Do not put credentials in custom headers. Use a secure credential reference.')
    }
    headers[name] = headerValue
  }
  return headers
}

const SQL_DATABASE_TYPES = ['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle']
const NOSQL_DATABASE_TYPES = ['MongoDB', 'DynamoDB', 'Cassandra']

const DATABASE_TYPE_ALIASES: Record<string, string> = {
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  'sql server': 'SQL Server',
  sqlserver: 'SQL Server',
  mssql: 'SQL Server',
  oracle: 'Oracle',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  dynamodb: 'DynamoDB',
  cassandra: 'Cassandra',
}

function normalizeIntegrationType(value: unknown): IntegrationType | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'rest' || normalized === 'rest_api') return 'REST'
  if (normalized === 'graphql' || normalized === 'graph_ql' || normalized === 'graphql_api') {
    return 'GraphQL'
  }
  if (normalized === 'sql' || normalized === 'sql_database') return 'SQL'
  if (normalized === 'nosql' || normalized === 'no_sql' || normalized === 'nosql_database') {
    return 'NoSQL'
  }
  return null
}

function normalizeDatabaseType(value: unknown, integrationType: IntegrationType): string | null {
  if (typeof value !== 'string') return null
  const normalized = DATABASE_TYPE_ALIASES[value.trim().toLowerCase()] ?? value.trim()
  const supportedTypes = integrationType === 'SQL'
    ? SQL_DATABASE_TYPES
    : integrationType === 'NoSQL'
      ? NOSQL_DATABASE_TYPES
      : []
  if (supportedTypes.length > 0 && !supportedTypes.includes(normalized)) return null
  return normalized
}

function normalizeTargetEnvironment(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return ENVIRONMENT_ALIASES[value.trim().toLowerCase()] ?? null
}

function normalizeAuthenticationType(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return AUTHENTICATION_ALIASES[normalized]
    ?? AUTHENTICATION_TYPES.find((type) => type.toLowerCase() === normalized)
    ?? null
}

function isValidCredentialReference(value: string) {
  return CREDENTIAL_REFERENCE_PATTERN.test(value.trim())
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:')
      && !url.username
      && !url.password
  } catch {
    return false
  }
}

function isValidNoSqlEndpoint(value: string) {
  try {
    const url = new URL(value)
    return ['https:', 'http:', 'mongodb:', 'mongodb+srv:'].includes(url.protocol)
      && !url.username
      && !url.password
  } catch {
    return false
  }
}

function FormField({
  id,
  label,
  error,
  required = false,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="cidan-form-field">
      <label htmlFor={id}>
        {label}
        {required && <span className="cidan-required"> *</span>}
      </label>
      {children}
      {hint && <span className="cidan-field-hint">{hint}</span>}
      {error && <span className="cidan-field-error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  )
}

function ConnectCIDANModal({ onClose, onDraftSave, initialConfiguration }: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  const baseUrlInputRef = useRef<HTMLInputElement>(null)
  const credentialReferenceInputRef = useRef<HTMLInputElement>(null)
  const connectionReferenceInputRef = useRef<HTMLInputElement>(null)
  const customHeadersRef = useRef<HTMLTextAreaElement>(null)
  const [values, setValues] = useState<FormValues>(() => initialConfiguration
    ? {
      bankName: initialConfiguration.bankName,
      bankIdentifier: initialConfiguration.bankIdentifier,
      integrationName: initialConfiguration.integrationName,
      targetEnvironment:
        normalizeTargetEnvironment(initialConfiguration.targetEnvironment)
        ?? initialConfiguration.targetEnvironment,
      integrationType: initialConfiguration.integrationType,
      baseUrl: initialConfiguration.baseUrl,
      rulesEndpoint: initialConfiguration.rulesEndpoint,
      httpMethod: initialConfiguration.httpMethod,
      authenticationType:
        normalizeAuthenticationType(initialConfiguration.authenticationType)
        ?? initialConfiguration.authenticationType,
      credentialReference: initialConfiguration.credentialReference,
      databaseType: initialConfiguration.databaseType,
      host: initialConfiguration.host,
      port: initialConfiguration.port,
      databaseName: initialConfiguration.databaseName,
      schema: initialConfiguration.schema,
      connectionReference: initialConfiguration.connectionReference,
      collection: initialConfiguration.collection,
    }
    : INITIAL_VALUES)
  const [customHeadersText, setCustomHeadersText] = useState(() =>
    initialConfiguration ? JSON.stringify(initialConfiguration.customHeaders, null, 2) : '',
  )
  const [autoFillSyncVersion, setAutoFillSyncVersion] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false)
  const [autoFillJson, setAutoFillJson] = useState('')
  const [autoFillMessage, setAutoFillMessage] = useState('')
  const [autoFillIsError, setAutoFillIsError] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const isVerifyingRef = useRef(isVerifying)

  useEffect(() => {
    if (baseUrlInputRef.current && baseUrlInputRef.current.value !== values.baseUrl) {
      baseUrlInputRef.current.value = values.baseUrl
    }
    if (
      credentialReferenceInputRef.current
      && credentialReferenceInputRef.current.value !== values.credentialReference
    ) {
      credentialReferenceInputRef.current.value = values.credentialReference
    }
    if (
      connectionReferenceInputRef.current
      && connectionReferenceInputRef.current.value !== values.connectionReference
    ) {
      connectionReferenceInputRef.current.value = values.connectionReference
    }
    if (customHeadersRef.current && customHeadersRef.current.value !== customHeadersText) {
      customHeadersRef.current.value = customHeadersText
    }
  }, [
    values.integrationType,
    values.baseUrl,
    values.credentialReference,
    values.connectionReference,
    customHeadersText,
    autoFillSyncVersion,
  ])

  useEffect(() => {
    isVerifyingRef.current = isVerifying
  }, [isVerifying])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!isVerifyingRef.current) onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
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

  function updateField<K extends FormField>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  function settleCredentialReference(
    field: 'credentialReference' | 'connectionReference',
    input: HTMLInputElement | null,
  ) {
    if (!input) return
    const value = input.value.trim()
    if (!value || isValidCredentialReference(value)) {
      updateField(field, value)
      return
    }

    input.value = values[field]
    setErrors((current) => ({
      ...current,
      [field]: 'Use a secure vault or secret-store reference; raw credentials are not accepted.',
    }))
  }

  function settleConnectionUrl(input: HTMLInputElement | null) {
    if (!input) return
    const value = input.value.trim()
    if (!value) {
      updateField('baseUrl', '')
      return
    }

    const isValid = values.integrationType === 'NoSQL'
      ? isValidNoSqlEndpoint(value)
      : isValidHttpUrl(value)
    if (isValid) {
      updateField('baseUrl', value)
      return
    }

    input.value = values.baseUrl
    setErrors((current) => ({
      ...current,
      baseUrl: 'Enter a valid endpoint without embedded credentials.',
    }))
  }

  function clearAutoFill() {
    setAutoFillJson('')
    setAutoFillMessage('')
    setAutoFillIsError(false)
  }

  function applyConfiguration() {
    const rawJson = autoFillJson.trim()
    if (!rawJson) {
      setAutoFillIsError(true)
      setAutoFillMessage('Paste a configuration JSON first.')
      return
    }

    setAutoFillMessage('')
    setAutoFillIsError(false)
    try {
      const parsed: unknown = JSON.parse(rawJson)
      if (!isRecord(parsed)) throw new Error('Configuration must be a JSON object.')
      if (containsSecretKey(parsed)) {
        throw new Error('Raw secrets are not allowed. Use secure credential references instead.')
      }

      const configuredTypeValue = parsed.integrationType
        ?? parsed.integration_type
        ?? parsed.source_type
        ?? parsed.sourceType
        ?? parsed.type
      const configuredType = configuredTypeValue === undefined
        ? values.integrationType
        : normalizeIntegrationType(configuredTypeValue)
      if (!configuredType) throw new Error('Integration type must be REST, GraphQL, SQL, or NoSQL.')
      const updates: Partial<FormValues> = {}
      let customHeaders: Record<string, string> = {}
      let hasCustomHeaders = false
      for (const [key, value] of Object.entries(parsed)) {
        if (key === 'customHeaders' || key === 'custom_headers' || key === 'headers') {
          customHeaders = parseHeaders(value)
          hasCustomHeaders = true
          continue
        }

        const field = FIELD_ALIASES[key]
        if (!field) throw new Error(`Unknown configuration field: ${key}.`)
        if (field === 'integrationType') {
          const type = normalizeIntegrationType(value)
          if (!type) throw new Error('Integration type must be REST, GraphQL, SQL, or NoSQL.')
          updates.integrationType = type
          continue
        }
        if (field === 'targetEnvironment') {
          const environment = normalizeTargetEnvironment(value)
          if (!environment) {
            throw new Error('Target environment must be Development, UAT (Staging), or Production.')
          }
          updates.targetEnvironment = environment
          continue
        }
        if (field === 'httpMethod') {
          if (typeof value !== 'string' || !HTTP_METHODS.includes(value.toUpperCase())) {
            throw new Error('HTTP method must be GET or POST.')
          }
          updates.httpMethod = value.toUpperCase()
          continue
        }
        if (field === 'authenticationType') {
          const authenticationType = normalizeAuthenticationType(value)
          if (!authenticationType) throw new Error('Select a supported authentication type.')
          updates.authenticationType = authenticationType
          continue
        }
        if (field === 'databaseType') {
          const databaseType = normalizeDatabaseType(value, configuredType)
          if (!databaseType) {
            throw new Error('Choose a supported database type for the selected integration type.')
          }
          updates.databaseType = databaseType
          continue
        }
        if (field === 'port') {
          if (typeof value !== 'number' && typeof value !== 'string') {
            throw new Error('Port must be a number or numeric string.')
          }
          updates.port = String(value)
          continue
        }
        if (typeof value !== 'string') {
          throw new Error(`${key} must be a string.`)
        }
        if (field === 'credentialReference' && value && !isValidCredentialReference(value)) {
          throw new Error('Credential references must use a vault:// or supported secret-store reference.')
        }
        if (field === 'connectionReference' && value && !isValidCredentialReference(value)) {
          throw new Error('Connection references must use a vault:// or supported secret-store reference.')
        }
        if (field === 'baseUrl' && value) {
          const validUrl = configuredType === 'NoSQL'
            ? isValidNoSqlEndpoint(value)
            : isValidHttpUrl(value)
          if (!validUrl) throw new Error('Connection URLs must be valid and must not contain embedded credentials.')
        }
        updates[field] = value
      }

      setValues((current) => ({
        ...current,
        ...updates,
        authenticationType:
          (updates.integrationType ?? current.integrationType) === 'NoSQL'
          && (updates.authenticationType ?? current.authenticationType) === PUBLIC_AUTHENTICATION_TYPE
            ? AUTHENTICATION_TYPES[0]
            : (updates.authenticationType ?? current.authenticationType),
      }))
      setErrors({})
      setSubmitError('')
      if (hasCustomHeaders) {
        setCustomHeadersText(JSON.stringify(customHeaders, null, 2))
      }
      setAutoFillSyncVersion((version) => version + 1)
      setAutoFillMessage('Configuration applied to the form. Review the fields before saving.')
    } catch (error) {
      setAutoFillIsError(true)
      setAutoFillMessage(
        error instanceof SyntaxError
          ? 'Invalid JSON. Check the quotes, commas, and braces, then try again.'
          : error instanceof Error
            ? error.message
            : 'Could not apply this configuration.',
      )
    }
  }

  function validateForm(): {
    errors: FieldErrors
    customHeaders: Record<string, string>
    baseUrl: string
    credentialReference: string
    connectionReference: string
  } {
    const nextErrors: FieldErrors = {}
    let customHeaders: Record<string, string> = {}
    const baseUrl = baseUrlInputRef.current?.value.trim() ?? values.baseUrl
    const credentialReference =
      credentialReferenceInputRef.current?.value.trim() ?? values.credentialReference
    const connectionReference =
      connectionReferenceInputRef.current?.value.trim() ?? values.connectionReference
    const requiredFields: FormField[] = [
      'bankName',
      'bankIdentifier',
      'integrationName',
      'targetEnvironment',
    ]
    for (const field of requiredFields) {
      if (!values[field].trim()) nextErrors[field] = 'This field is required.'
    }
    if (!ENVIRONMENTS.includes(values.targetEnvironment)) {
      nextErrors.targetEnvironment = 'Select a supported target environment.'
    }
    if (!HTTP_METHODS.includes(values.httpMethod)) {
      nextErrors.httpMethod = 'Select a supported HTTP method.'
    }

    try {
      const headerText = customHeadersRef.current?.value.trim() ?? ''
      customHeaders = headerText ? parseHeaders(JSON.parse(headerText) as unknown) : {}
    } catch {
      nextErrors.customHeaders =
        'Enter a valid JSON object of string headers. Do not include credentials or secrets.'
    }

    if (values.integrationType === 'REST' || values.integrationType === 'GraphQL') {
      if (!baseUrl) nextErrors.baseUrl = 'Base URL is required.'
      else if (!isValidHttpUrl(baseUrl)) {
        nextErrors.baseUrl = 'Enter a valid HTTP or HTTPS URL without embedded credentials.'
      }
      if (!values.rulesEndpoint.trim()) {
        nextErrors.rulesEndpoint = values.integrationType === 'GraphQL'
          ? 'GraphQL endpoint is required.'
          : 'Rules endpoint is required.'
      } else if (!values.rulesEndpoint.trim().startsWith('/')) {
        nextErrors.rulesEndpoint = 'Enter a relative endpoint path, such as /compliance/rules.'
      }
      if (!AUTHENTICATION_TYPES.includes(values.authenticationType)) {
        nextErrors.authenticationType = 'Select a supported authentication type.'
      }
      if (values.authenticationType !== PUBLIC_AUTHENTICATION_TYPE
        && !isValidCredentialReference(credentialReference)) {
        nextErrors.credentialReference = 'Enter a secure vault or secret-store reference; do not enter a raw credential.'
      }
      if (values.authenticationType === PUBLIC_AUTHENTICATION_TYPE && credentialReference
        && !isValidCredentialReference(credentialReference)) {
        nextErrors.credentialReference = 'Use a secure credential reference or leave this field empty.'
      }
    } else if (values.integrationType === 'SQL') {
      if (!['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle'].includes(values.databaseType)) {
        nextErrors.databaseType = 'Select a supported SQL database type.'
      }
      if (!values.host.trim()) nextErrors.host = 'Host is required.'
      const port = Number(values.port)
      if (!values.port || !Number.isInteger(port) || port < 1 || port > 65535) {
        nextErrors.port = 'Enter a valid port from 1 to 65535.'
      }
      if (!values.databaseName.trim()) nextErrors.databaseName = 'Database name is required.'
      if (!values.schema.trim()) nextErrors.schema = 'Schema is required.'
      if (!isValidCredentialReference(connectionReference)) {
        nextErrors.connectionReference = 'Use a secure reference for the connection; do not enter a connection string with credentials.'
      }
      if (!isValidCredentialReference(credentialReference)) {
        nextErrors.credentialReference = 'Enter a secure vault or secret-store reference; do not enter a raw credential.'
      }
    } else {
      if (!['MongoDB', 'DynamoDB', 'Cassandra'].includes(values.databaseType)) {
        nextErrors.databaseType = 'Select a supported NoSQL database type.'
      }
      if (!baseUrl) nextErrors.baseUrl = 'Connection endpoint is required.'
      else if (!isValidNoSqlEndpoint(baseUrl)) {
        nextErrors.baseUrl = 'Enter a valid MongoDB, HTTP, or HTTPS endpoint without embedded credentials.'
      }
      if (!values.databaseName.trim()) nextErrors.databaseName = 'Database name is required.'
      if (!values.collection.trim()) nextErrors.collection = 'Collection is required.'
      if (!AUTHENTICATION_TYPES.filter((type) => type !== PUBLIC_AUTHENTICATION_TYPE).includes(values.authenticationType)) {
        nextErrors.authenticationType = 'Select a supported authentication type.'
      }
      if (!isValidCredentialReference(credentialReference)) {
        nextErrors.credentialReference = 'Enter a secure vault or secret-store reference; do not enter a raw credential.'
      }
    }

    return {
      errors: nextErrors,
      customHeaders,
      baseUrl,
      credentialReference,
      connectionReference,
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isVerifying) return

    setSubmitError('')
    const validation = validateForm()
    setErrors(validation.errors)
    if (Object.keys(validation.errors).length > 0) {
      setSubmitError('Review the highlighted fields before verifying.')
      return
    }

    const configuration: IntegrationConfiguration = {
      ...values,
      baseUrl: validation.baseUrl,
      credentialReference: validation.credentialReference,
      connectionReference: validation.connectionReference,
      customHeaders: validation.customHeaders,
    }

    setIsVerifying(true)
    try {
      await verifyIntegrationConfiguration(configuration)
      onClose()
    } catch (error) {
      if (error instanceof IntegrationVerificationUnavailableError) {
        onDraftSave(configuration)
        setSubmitError(`${error.message} A local, unverified draft is shown below.`)
      } else {
        setSubmitError(error instanceof Error
          ? error.message
          : 'CIDAN could not verify this integration. No configuration was saved.')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const typeOptions: { type: IntegrationType; image: string }[] = [
    { type: 'REST', image: restApiImage },
    { type: 'GraphQL', image: graphqlImage },
    { type: 'SQL', image: postgresSqlImage },
    { type: 'NoSQL', image: redisImage },
  ]
  const credentialLabel = 'Secure Credential Reference (Token / Vault Ref - No raw passwords)'

  return (
    <div
      className="cidan-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isVerifying) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="cidan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cidan-modal-title"
        aria-describedby="cidan-modal-subtitle"
        tabIndex={-1}
      >
        <header className="cidan-modal-header">
          <span className="cidan-modal-brand-icon" aria-hidden="true"><Landmark size={22} /></span>
          <div className="cidan-modal-heading">
            <h2 id="cidan-modal-title">Connect with CIDAN</h2>
            <p id="cidan-modal-subtitle">Enterprise Banking Rules &amp; Database Ingestion Gateway</p>
          </div>
          <button
            className="cidan-modal-close"
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            aria-label="Close Connect with CIDAN"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <form className="cidan-modal-form" onSubmit={handleSubmit} noValidate>
          <div className="cidan-modal-body">
            <section className={`cidan-json-section${isAutoFillOpen ? ' cidan-json-section--open' : ''}`}>
              <button
                className="cidan-json-toggle"
                type="button"
                onClick={() => setIsAutoFillOpen((open) => !open)}
                aria-expanded={isAutoFillOpen}
                aria-controls="cidan-json-panel"
              >
                <span className="cidan-json-icon" aria-hidden="true"><Braces size={18} /></span>
                <span className="cidan-json-copy">
                  <strong>Auto-Fill Fields via JSON</strong>
                  <span>Paste configuration JSON to populate all form fields automatically</span>
                </span>
                <ChevronDown
                  className={isAutoFillOpen ? 'cidan-chevron cidan-chevron--open' : 'cidan-chevron'}
                  size={18}
                  aria-hidden="true"
                />
              </button>
              {isAutoFillOpen && (
                <div className="cidan-json-panel" id="cidan-json-panel">
                  <textarea
                    className="cidan-code-input"
                    rows={5}
                    spellCheck={false}
                    aria-label="Configuration JSON"
                    value={autoFillJson}
                    onChange={(event) => {
                      setAutoFillJson(event.currentTarget.value)
                      if (autoFillMessage) {
                        setAutoFillMessage('')
                        setAutoFillIsError(false)
                      }
                    }}
                    placeholder={'{\n  "source_type": "REST",\n  "base_url": "https://cidan-bank-rules.free.beeceptor.com",\n  "endpoint": "/api/v1/compliance/rules"\n}'}
                  />
                  {autoFillMessage && (
                    <p
                      className={autoFillIsError ? 'cidan-json-feedback cidan-json-feedback--error' : 'cidan-json-feedback'}
                      role="status"
                    >
                      {autoFillMessage}
                    </p>
                  )}
                  <div className="cidan-json-actions">
                    <button className="cidan-json-clear" type="button" onClick={clearAutoFill}>
                      <X size={14} aria-hidden="true" />
                      Clear
                    </button>
                    <button className="cidan-button cidan-button--primary cidan-apply-json" type="button" onClick={applyConfiguration}>
                      <Zap size={14} aria-hidden="true" />
                      Auto-Fill All Fields
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="cidan-form-section" aria-labelledby="cidan-bank-heading">
              <h3 id="cidan-bank-heading"><span>1</span> Bank &amp; Environment Details</h3>
              <div className="cidan-form-grid">
                <FormField id="bankName" label="Bank Name" required error={errors.bankName}>
                  <input id="bankName" value={values.bankName} onChange={(event) => updateField('bankName', event.currentTarget.value)} placeholder="Enter bank name" aria-invalid={Boolean(errors.bankName)} />
                </FormField>
                <FormField id="bankIdentifier" label="Bank Identifier / Code" required error={errors.bankIdentifier}>
                  <input id="bankIdentifier" value={values.bankIdentifier} onChange={(event) => updateField('bankIdentifier', event.currentTarget.value)} placeholder="Enter bank identifier" aria-invalid={Boolean(errors.bankIdentifier)} />
                </FormField>
                <FormField id="integrationName" label="Integration Name" required error={errors.integrationName}>
                  <input id="integrationName" value={values.integrationName} onChange={(event) => updateField('integrationName', event.currentTarget.value)} placeholder="Enter integration name" aria-invalid={Boolean(errors.integrationName)} />
                </FormField>
                <FormField id="targetEnvironment" label="Target Environment" required error={errors.targetEnvironment}>
                  <select id="targetEnvironment" value={values.targetEnvironment} onChange={(event) => updateField('targetEnvironment', event.currentTarget.value)} aria-invalid={Boolean(errors.targetEnvironment)}>
                    <option value="" disabled hidden>Select environment</option>
                    {ENVIRONMENTS.map((environment) => (
                      <option key={environment} value={environment}>{environment}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            </section>

            <section className="cidan-form-section" aria-labelledby="cidan-type-heading">
              <h3 id="cidan-type-heading"><span>2</span> Integration Type &amp; Engine</h3>
              <div className="cidan-type-selector" role="group" aria-label="Integration type">
                {typeOptions.map(({ type, image }) => (
                  <button
                    key={type}
                    className={`cidan-type-option${values.integrationType === type ? ' cidan-type-option--selected' : ''}`}
                    type="button"
                    aria-pressed={values.integrationType === type}
                    onClick={() => {
                      setValues((current) => ({
                        ...current,
                        integrationType: type,
                        databaseType: current.integrationType === type ? current.databaseType : '',
                        authenticationType:
                          type === 'NoSQL' && current.authenticationType === PUBLIC_AUTHENTICATION_TYPE
                            ? AUTHENTICATION_TYPES[0]
                            : current.authenticationType,
                      }))
                      setErrors({})
                      setSubmitError('')
                    }}
                  >
                    <img className="cidan-type-option-image" src={image} alt="" aria-hidden="true" />
                    {type}
                  </button>
                ))}
              </div>
            </section>

            <section className="cidan-form-section" aria-labelledby="cidan-connection-heading">
              <h3 id="cidan-connection-heading"><span>3</span> Connection &amp; Security Configuration</h3>

              {(values.integrationType === 'REST' || values.integrationType === 'GraphQL') && (
                <div className="cidan-form-grid">
                  <FormField id="baseUrl" label="Base URL" required error={errors.baseUrl}>
                    <input id="baseUrl" ref={baseUrlInputRef} type="url" defaultValue={values.baseUrl} onBlur={(event) => settleConnectionUrl(event.currentTarget)} placeholder="https://api.bank.com" aria-invalid={Boolean(errors.baseUrl)} />
                  </FormField>
                  <FormField
                    id="rulesEndpoint"
                    label={values.integrationType === 'GraphQL' ? 'GraphQL Endpoint' : 'Rules Endpoint'}
                    required
                    error={errors.rulesEndpoint}
                  >
                    <input id="rulesEndpoint" value={values.rulesEndpoint} onChange={(event) => updateField('rulesEndpoint', event.currentTarget.value)} placeholder={values.integrationType === 'GraphQL' ? '/graphql' : '/compliance/rules'} aria-invalid={Boolean(errors.rulesEndpoint)} />
                  </FormField>
                  <FormField id="httpMethod" label="HTTP Method" required error={errors.httpMethod}>
                    <select id="httpMethod" value={values.httpMethod} onChange={(event) => updateField('httpMethod', event.currentTarget.value)} aria-invalid={Boolean(errors.httpMethod)}>
                      {HTTP_METHODS.map((method) => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="authenticationType" label="Authentication Type" required error={errors.authenticationType}>
                    <select id="authenticationType" value={values.authenticationType} onChange={(event) => updateField('authenticationType', event.currentTarget.value)} aria-invalid={Boolean(errors.authenticationType)}>
                      {AUTHENTICATION_TYPES.map((authType) => (
                        <option key={authType} value={authType}>{authType}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    id="credentialReference"
                    label={credentialLabel}
                    required={values.authenticationType !== PUBLIC_AUTHENTICATION_TYPE}
                    error={errors.credentialReference}
                    hint="Use a vault:// or secret-store reference. Never enter a raw secret."
                  >
                    <input id="credentialReference" ref={credentialReferenceInputRef} defaultValue={values.credentialReference} onBlur={(event) => settleCredentialReference('credentialReference', event.currentTarget)} placeholder="vault://secrets/cidan-api-key" aria-invalid={Boolean(errors.credentialReference)} autoComplete="off" />
                  </FormField>
                  <FormField id="customHeaders" label="Custom Headers (JSON)" error={errors.customHeaders} hint="Use an object of string values. Store credentials in a secure reference, not in headers.">
                    <textarea
                      id="customHeaders"
                      ref={customHeadersRef}
                      className="cidan-code-input cidan-headers-input"
                      rows={3}
                      spellCheck={false}
                      defaultValue={customHeadersText}
                      placeholder={'{\n  "X-Bank-Client": "CIDAN-Agent"\n}'}
                      aria-invalid={Boolean(errors.customHeaders)}
                      onChange={(event) => {
                        setCustomHeadersText(event.currentTarget.value)
                        setErrors((current) => ({ ...current, customHeaders: undefined }))
                        setSubmitError('')
                      }}
                    />
                  </FormField>
                </div>
              )}

              {values.integrationType === 'SQL' && (
                <div className="cidan-form-grid">
                  <FormField id="databaseType" label="Database Type" required error={errors.databaseType}>
                    <div className="cidan-database-select">
                      <select id="databaseType" value={values.databaseType} onChange={(event) => updateField('databaseType', event.currentTarget.value)} aria-invalid={Boolean(errors.databaseType)}>
                        <option value="">Select database type</option>
                        <option>PostgreSQL</option>
                        <option>MySQL</option>
                        <option>SQL Server</option>
                        <option>Oracle</option>
                      </select>
                      {DATABASE_TYPE_IMAGES[values.databaseType] && (
                        <img src={DATABASE_TYPE_IMAGES[values.databaseType]} alt="" aria-hidden="true" />
                      )}
                    </div>
                  </FormField>
                  <FormField id="host" label="Host" required error={errors.host}>
                    <input id="host" value={values.host} onChange={(event) => updateField('host', event.currentTarget.value)} placeholder="db.bank.internal" aria-invalid={Boolean(errors.host)} />
                  </FormField>
                  <FormField id="port" label="Port" required error={errors.port}>
                    <input id="port" type="number" min="1" max="65535" value={values.port} onChange={(event) => updateField('port', event.currentTarget.value)} placeholder="5432" aria-invalid={Boolean(errors.port)} />
                  </FormField>
                  <FormField id="databaseName" label="Database Name" required error={errors.databaseName}>
                    <input id="databaseName" value={values.databaseName} onChange={(event) => updateField('databaseName', event.currentTarget.value)} placeholder="compliance_rules" aria-invalid={Boolean(errors.databaseName)} />
                  </FormField>
                  <FormField id="schema" label="Schema" required error={errors.schema}>
                    <input id="schema" value={values.schema} onChange={(event) => updateField('schema', event.currentTarget.value)} placeholder="public" aria-invalid={Boolean(errors.schema)} />
                  </FormField>
                  <FormField id="connectionReference" label="Connection / Credential Reference" required error={errors.connectionReference} hint="Use a vault:// or secret-store reference, not a connection string containing a password.">
                    <input id="connectionReference" ref={connectionReferenceInputRef} defaultValue={values.connectionReference} onBlur={(event) => settleCredentialReference('connectionReference', event.currentTarget)} placeholder="vault://secrets/sql-connection" aria-invalid={Boolean(errors.connectionReference)} autoComplete="off" />
                  </FormField>
                  <FormField id="credentialReference" label={credentialLabel} required error={errors.credentialReference} hint="No raw passwords or database credentials.">
                    <input id="credentialReference" ref={credentialReferenceInputRef} defaultValue={values.credentialReference} onBlur={(event) => settleCredentialReference('credentialReference', event.currentTarget)} placeholder="vault://secrets/sql-credential" aria-invalid={Boolean(errors.credentialReference)} autoComplete="off" />
                  </FormField>
                </div>
              )}

              {values.integrationType === 'NoSQL' && (
                <div className="cidan-form-grid">
                  <FormField id="databaseType" label="Database Type" required error={errors.databaseType}>
                    <div className="cidan-database-select">
                      <select id="databaseType" value={values.databaseType} onChange={(event) => updateField('databaseType', event.currentTarget.value)} aria-invalid={Boolean(errors.databaseType)}>
                        <option value="">Select database type</option>
                        <option>MongoDB</option>
                        <option>DynamoDB</option>
                        <option>Cassandra</option>
                      </select>
                      {DATABASE_TYPE_IMAGES[values.databaseType] && (
                        <img src={DATABASE_TYPE_IMAGES[values.databaseType]} alt="" aria-hidden="true" />
                      )}
                    </div>
                  </FormField>
                  <FormField id="baseUrl" label="Connection Endpoint" required error={errors.baseUrl}>
                    <input id="baseUrl" ref={baseUrlInputRef} defaultValue={values.baseUrl} onBlur={(event) => settleConnectionUrl(event.currentTarget)} placeholder="mongodb+srv://cluster.example.net" aria-invalid={Boolean(errors.baseUrl)} />
                  </FormField>
                  <FormField id="databaseName" label="Database Name" required error={errors.databaseName}>
                    <input id="databaseName" value={values.databaseName} onChange={(event) => updateField('databaseName', event.currentTarget.value)} placeholder="compliance_rules" aria-invalid={Boolean(errors.databaseName)} />
                  </FormField>
                  <FormField id="collection" label="Collection" required error={errors.collection}>
                    <input id="collection" value={values.collection} onChange={(event) => updateField('collection', event.currentTarget.value)} placeholder="rules" aria-invalid={Boolean(errors.collection)} />
                  </FormField>
                  <FormField id="authenticationType" label="Authentication Type" required error={errors.authenticationType}>
                    <select id="authenticationType" value={values.authenticationType} onChange={(event) => updateField('authenticationType', event.currentTarget.value)} aria-invalid={Boolean(errors.authenticationType)}>
                      {AUTHENTICATION_TYPES.filter((type) => type !== PUBLIC_AUTHENTICATION_TYPE).map((authType) => (
                        <option key={authType} value={authType}>{authType}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="credentialReference" label={credentialLabel} required error={errors.credentialReference} hint="Use a secure reference; never enter a raw credential.">
                    <input id="credentialReference" ref={credentialReferenceInputRef} defaultValue={values.credentialReference} onBlur={(event) => settleCredentialReference('credentialReference', event.currentTarget)} placeholder="vault://secrets/nosql-credential" aria-invalid={Boolean(errors.credentialReference)} autoComplete="off" />
                  </FormField>
                </div>
              )}
            </section>
          </div>

          <footer className="cidan-modal-footer">
            <div className="cidan-engine-label">
              <Code2 size={16} aria-hidden="true" />
              <span>Engine:</span>
              <strong>{ENGINE_BY_TYPE[values.integrationType]}</strong>
            </div>
            <div className="cidan-modal-footer-actions">
              <button className="cidan-button cidan-button--secondary" type="button" onClick={onClose} disabled={isVerifying}>
                Cancel
              </button>
              <button className="cidan-button cidan-button--primary" type="submit" disabled={isVerifying}>
                {isVerifying
                  ? <LoaderCircle className="cidan-loading-spinner" size={17} aria-hidden="true" />
                  : <ShieldCheck size={17} aria-hidden="true" />}
                {isVerifying ? 'Verifying connection...' : 'Save & Verify'}
              </button>
            </div>
            {submitError && <p className="cidan-submit-error" role="alert">{submitError}</p>}
          </footer>
        </form>
      </section>
    </div>
  )
}

export { ConnectCIDANModal }
