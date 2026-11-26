import type { IntegrationConfiguration } from './integrationService'

export type IntegrationConnectionStatus = 'connected' | 'pending' | 'disconnected'

export type IntegrationDocumentData = {
  fileName?: string
  fileType?: string
  fileSize?: number
  connectionStatus?: IntegrationConnectionStatus
  extractedAt?: string
  fetchLog?: string
  rules: unknown[]
  rawContent: string | null
}

type ComplianceAuditMetadata = {
  connectionStatus?: IntegrationConnectionStatus
  extractedAt?: string
  fetchLog?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false
  if (Array.isArray(value)) return value.some(hasValue)
  if (isRecord(value)) return Object.values(value).some(hasValue)
  return true
}

function formatLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeKey(key: string) {
  return key.replace(/[_\s-]/g, '').toLowerCase()
}

function getRuleValue(rule: Record<string, unknown>, keys: string[]) {
  const wanted = new Set(keys.map(normalizeKey))
  const entry = Object.entries(rule).find(([key, value]) =>
    wanted.has(normalizeKey(key)) && hasValue(value),
  )
  return entry?.[1]
}

function formatAuditValue(value: unknown, depth = 1): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  const indent = '  '.repeat(depth)
  if (Array.isArray(value)) {
    return value
      .filter(hasValue)
      .map((item) => {
        const rendered = formatAuditValue(item, depth + 1)
        return `${indent}- ${rendered.replace(/\n/g, `\n${indent}  `)}`
      })
      .join('\n')
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([, entryValue]) => hasValue(entryValue))
      .map(([key, entryValue]) =>
        `${indent}${formatLabel(key)}: ${formatAuditValue(entryValue, depth + 1)}`,
      )
      .join('\n')
  }
  return ''
}

function getIntegrationEngine(integration: IntegrationConfiguration) {
  switch (integration.integrationType) {
    case 'REST':
      return 'REST_API'
    case 'GraphQL':
      return 'GRAPHQL_API'
    case 'SQL':
      return 'SQL_DATABASE'
    case 'NoSQL':
      return 'NOSQL_DATABASE'
  }
}

function getIntegrationTarget(integration: IntegrationConfiguration) {
  if (integration.integrationType === 'SQL') {
    return [integration.host, integration.port].filter(Boolean).join(':')
  }
  return integration.baseUrl
}

function getIntegrationCollection(integration: IntegrationConfiguration) {
  switch (integration.integrationType) {
    case 'REST':
    case 'GraphQL':
      return integration.rulesEndpoint
    case 'SQL':
      return [integration.databaseName, integration.schema].filter(Boolean).join(' / ')
    case 'NoSQL':
      return [integration.databaseName, integration.collection].filter(Boolean).join(' / ')
  }
}

function getRuleHeader(rule: unknown, index: number) {
  if (!isRecord(rule)) return `[Rule ${index + 1}]`

  const ruleId = getRuleValue(rule, ['id', 'ruleId'])
  const title = getRuleValue(rule, ['title', 'ruleTitle', 'name'])
  const identifier = typeof ruleId === 'string' || typeof ruleId === 'number'
    ? String(ruleId).trim()
    : ''
  const ruleTitle = typeof title === 'string' || typeof title === 'number'
    ? String(title).trim()
    : ''

  return `[Rule ${index + 1}]${identifier ? ` ${identifier}` : ''}${ruleTitle ? `: ${ruleTitle}` : ''}`
}

function formatRule(rule: unknown, index: number) {
  const lines = [getRuleHeader(rule, index)]
  if (!isRecord(rule)) {
    if (hasValue(rule)) lines.push(`Details: ${formatAuditValue(rule)}`)
    return lines.join('\n')
  }

  const headerKeys = new Set(['id', 'ruleid', 'title', 'ruletitle', 'name'])
  for (const [key, value] of Object.entries(rule)) {
    if (headerKeys.has(normalizeKey(key)) || !hasValue(value)) continue
    const formattedValue = formatAuditValue(value)
    if (!formattedValue) continue
    if (Array.isArray(value) || isRecord(value)) {
      lines.push(`${formatLabel(key)}:\n${formattedValue}`)
    } else {
      lines.push(`${formatLabel(key)}: ${formattedValue}`)
    }
  }
  return lines.join('\n')
}

export function generateComplianceAuditText(
  integration: IntegrationConfiguration,
  complianceRules: unknown[],
  metadata: ComplianceAuditMetadata = {},
): string {
  const rules = complianceRules.filter(hasValue)
  if (rules.length === 0) return ''

  const lines: string[] = []
  const bank = [
    integration.bankName.trim(),
    integration.bankIdentifier.trim() ? `(${integration.bankIdentifier.trim()})` : '',
  ].filter(Boolean).join(' ')
  const fields: Array<[string, string]> = [
    ['Bank', bank],
    ['Integration Source', integration.integrationName.trim()],
    ['Engine', getIntegrationEngine(integration)],
    ['Environment', integration.targetEnvironment.trim()],
    ['Target DB / Service', getIntegrationTarget(integration).trim()],
    ['Table / Collection', getIntegrationCollection(integration).trim()],
    ['Connection Status', metadata.connectionStatus ?? 'pending'],
    ['Extracted At', metadata.extractedAt?.trim() ?? ''],
    ['Fetch Log', metadata.fetchLog?.trim() ?? ''],
  ]

  for (const [label, value] of fields) {
    if (!value) continue
    const displayValue = label === 'Connection Status'
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : value
    lines.push(`${label}: ${displayValue}`)
  }

  lines.push(
    `Rules Retrieved: ${rules.length}`,
    '',
    '='.repeat(60),
    '',
    `RETRIEVED COMPLIANCE RULES (${rules.length} RULES FOUND)`,
    '',
  )
  lines.push(...rules.map(formatRule))
  return lines.join('\n')
}

export async function loadIntegrationDocument(
  integrationId: string,
): Promise<IntegrationDocumentData> {
  if (!integrationId.trim()) throw new Error('A saved integration must be selected.')

  throw new Error(
    'Integration document retrieval is not available yet. No rules or raw response were loaded.',
  )
}
