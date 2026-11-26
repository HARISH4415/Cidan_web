import { supabase, supabaseConfigError } from './supabase'
import { getActiveBankProfile } from '../services/bankDataService'

const apiBaseUrl = import.meta.env.VITE_CIDAN_API_URL?.trim().replace(/\/+$/, '')

type ApprovalAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'

interface DeltaAnalysisInput {
  circularNumber: string
  circularText: string
}

interface ApprovalActionInput {
  workflowId: string
  action: ApprovalAction
  note: string
}

function parseResponseBody(text: string): unknown {
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    if (error instanceof SyntaxError) return text
    throw error
  }
}

function getErrorDetail(body: unknown): string {
  if (typeof body === 'string') return body.slice(0, 300)
  if (typeof body !== 'object' || body === null) return ''

  const record = body as Record<string, unknown>
  const detail = record.detail ?? record.message ?? record.error
  return typeof detail === 'string' ? detail.slice(0, 300) : ''
}

async function getAccessToken(): Promise<string> {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(`Could not read the Supabase session: ${error.message}`)
  if (!data.session?.access_token) {
    throw new Error('Sign in with Supabase before calling the CIDAN API.')
  }

  return data.session.access_token
}

async function request(path: string, method: 'GET' | 'POST', payload?: object): Promise<unknown> {
  if (!apiBaseUrl) {
    throw new Error('Missing VITE_CIDAN_API_URL. Set the FastAPI base URL and restart Vite.')
  }

  const accessToken = await getAccessToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  })

  const body = parseResponseBody(await response.text())
  if (!response.ok) {
    const detail = getErrorDetail(body)
    throw new Error(
      `CIDAN API request failed (${response.status})${detail ? `: ${detail}` : ''}`,
    )
  }

  return body
}

export async function runDeltaAnalysis({ circularNumber, circularText }: DeltaAnalysisInput) {
  const profile = await getActiveBankProfile()
  return request('/deltas/analyze', 'POST', {
    analysis_name: `Analysis for ${circularNumber}`,
    circular_number: circularNumber,
    circular_text: circularText,
    bank_id: profile.bank_id,
  })
}

export function getDeltas() {
  return request('/deltas', 'GET')
}

export async function generateTestCases(ruleIr: unknown) {
  const profile = await getActiveBankProfile()
  return request('/testing/generate-cases', 'POST', {
    rule_ir: ruleIr,
    bank_id: profile.bank_id,
  })
}

export async function submitApprovalAction({ workflowId, action, note }: ApprovalActionInput) {
  const profile = await getActiveBankProfile()
  return request(`/approvals/${encodeURIComponent(workflowId)}/action`, 'POST', {
    action,
    reviewer_email: profile.email,
    note,
  })
}
