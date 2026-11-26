import { supabase, supabaseConfigError } from '../lib/supabase'

export type UserHistoryRecord = {
  id: string
  action_type: UserHistoryActivity['actionType'] | string
  document_name: string | null
  workflow_id: string | null
  compliance_score: number | null
  summary: string | null
  created_at: string | null
}

type UserHistoryActivity = {
  actionType: 'login_success' | 'document_analysis_completed' | 'demo_deployment_completed'
  documentName?: string
  documentId?: string
  workflowId?: string
  complianceScore?: number
  summary?: string
  metadata?: Record<string, string | number | boolean | null>
}

async function recordUserActivity(activity: UserHistoryActivity): Promise<void> {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(`Could not read the authenticated user: ${userError.message}`)
  if (!user?.email) throw new Error('The authenticated Supabase user does not have an email address.')

  const { error } = await supabase.from('user_history').insert({
    user_email: user.email,
    action_type: activity.actionType,
    document_name: activity.documentName ?? null,
    document_id: activity.documentId ?? null,
    workflow_id: activity.workflowId ?? null,
    compliance_score: activity.complianceScore ?? null,
    summary: activity.summary ?? null,
    metadata: {
      user_id: user.id,
      ...activity.metadata,
    },
  })

  if (error) throw new Error(`Could not insert user history: ${error.message}`)
}

export function recordSuccessfulLogin(): Promise<void> {
  return recordUserActivity({
    actionType: 'login_success',
    summary: 'User signed in with email OTP.',
    metadata: { auth_method: 'email_otp' },
  })
}

export function recordDocumentAnalysis(input: {
  documentName: string
  workflowId: string
  fileSize: number
}): Promise<void> {
  return recordUserActivity({
    actionType: 'document_analysis_completed',
    documentName: input.documentName,
    workflowId: input.workflowId,
    summary: 'Document analysis completed.',
    metadata: { file_size_bytes: input.fileSize },
  })
}

export function recordDemoDeployment(input: {
  documentName: string
  workflowId: string
}): Promise<void> {
  return recordUserActivity({
    actionType: 'demo_deployment_completed',
    documentName: input.documentName,
    workflowId: input.workflowId,
    summary: 'Demo workflow completed; no production deployment was performed.',
  })
}

function normalizeHistoryRow(row: Record<string, unknown>, index: number): UserHistoryRecord {
  return {
    id: typeof row.id === 'string' || typeof row.id === 'number' ? String(row.id) : `history-${index}`,
    action_type: typeof row.action_type === 'string' ? row.action_type : 'activity',
    document_name: typeof row.document_name === 'string' ? row.document_name : null,
    workflow_id: typeof row.workflow_id === 'string' ? row.workflow_id : null,
    compliance_score: typeof row.compliance_score === 'number' ? row.compliance_score : null,
    summary: typeof row.summary === 'string' ? row.summary : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
  }
}

export async function getRecentRegulatoryHistory(limit = 20): Promise<UserHistoryRecord[]> {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(`Could not read the authenticated user: ${userError.message}`)
  if (!user?.email) throw new Error('Sign in to view your regulatory history.')

  const orderedResult = await supabase
    .from('user_history')
    .select('id, action_type, document_name, workflow_id, compliance_score, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!orderedResult.error) {
    return (orderedResult.data ?? []).map((row, index) =>
      normalizeHistoryRow(row as Record<string, unknown>, index),
    )
  }

  if (orderedResult.error.code === '42703' || orderedResult.error.message.includes('created_at')) {
    const fallbackResult = await supabase
      .from('user_history')
      .select('*')
      .limit(limit)
    if (fallbackResult.error) {
      throw new Error(`Could not load user history: ${fallbackResult.error.message}`)
    }
    return (fallbackResult.data ?? []).map((row, index) =>
      normalizeHistoryRow(row as Record<string, unknown>, index),
    )
  }

  throw new Error(`Could not load user history: ${orderedResult.error.message}`)
}
