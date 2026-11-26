export type CopilotMessageRequest = {
  message: string
  context?: {
    name: string
    status: 'connected' | 'pending' | 'disconnected'
  }
  attachments?: File[]
}

export async function sendCopilotMessage(request: CopilotMessageRequest): Promise<string> {
  if (!request.message.trim() && (request.attachments?.length ?? 0) === 0) {
    throw new Error('Enter a question or attach a supported file before sending.')
  }

  throw new Error(
    'CIDAN Copilot is unavailable because this project has no chat API endpoint. Your message and attachments were not sent.',
  )
}
