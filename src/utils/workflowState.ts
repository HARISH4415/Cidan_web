import { EMAIL_STORAGE_KEY } from './emailState'

export const WORKFLOW_STORAGE_KEY = 'cidan-document-workflow'

export type WorkflowStatus = 'analysis-complete' | 'demo-deployment-complete'

export type DocumentWorkflow = {
  fileName: string
  fileSize: number
  workflowId: string
  status: WorkflowStatus
}

export function saveDocumentWorkflow(workflow: DocumentWorkflow) {
  sessionStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflow))
}

export function getDocumentWorkflow(): DocumentWorkflow | null {
  const stored = sessionStorage.getItem(WORKFLOW_STORAGE_KEY)
  if (!stored) return null

  try {
    const parsed: unknown = JSON.parse(stored)
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'fileName' in parsed
      && typeof parsed.fileName === 'string'
      && 'fileSize' in parsed
      && typeof parsed.fileSize === 'number'
      && 'workflowId' in parsed
      && typeof parsed.workflowId === 'string'
      && 'status' in parsed
      && (parsed.status === 'analysis-complete' || parsed.status === 'demo-deployment-complete')
    ) {
      return parsed as DocumentWorkflow
    }
  } catch {
    return null
  }

  return null
}

export function updateWorkflowStatus(status: WorkflowStatus) {
  const workflow = getDocumentWorkflow()
  if (!workflow) return
  saveDocumentWorkflow({ ...workflow, status })
}

export function clearDocumentWorkflow() {
  sessionStorage.removeItem(WORKFLOW_STORAGE_KEY)
}

export function getAuthenticatedUsername() {
  const email = sessionStorage.getItem(EMAIL_STORAGE_KEY)?.trim()
  if (!email) return 'User'
  return email.split('@')[0] || 'User'
}
