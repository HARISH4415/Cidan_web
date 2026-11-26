export type IntegrationType = 'REST' | 'GraphQL' | 'SQL' | 'NoSQL'

export type IntegrationConfiguration = {
  bankName: string
  bankIdentifier: string
  integrationName: string
  targetEnvironment: string
  integrationType: IntegrationType
  baseUrl: string
  rulesEndpoint: string
  httpMethod: string
  authenticationType: string
  credentialReference: string
  customHeaders: Record<string, string>
  databaseType: string
  host: string
  port: string
  databaseName: string
  schema: string
  connectionReference: string
  collection: string
}

export class IntegrationVerificationUnavailableError extends Error {
  constructor() {
    super('CIDAN integration verification is not available yet. The configuration was not saved to the backend.')
    this.name = 'IntegrationVerificationUnavailableError'
  }
}

export async function verifyIntegrationConfiguration(
  configuration: IntegrationConfiguration,
): Promise<void> {
  void configuration
  throw new IntegrationVerificationUnavailableError()
}
