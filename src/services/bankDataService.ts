import { supabase, supabaseConfigError } from '../lib/supabase'

export interface ActiveBankProfile {
  id: string
  bank_id: string
  email: string
  role: string
  is_active: true
}

export interface BankScopedRecord {
  id: string
  bank_id: string
  [column: string]: unknown
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function requireSupabase() {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.')
  return supabase
}

export async function getActiveBankProfile(): Promise<ActiveBankProfile> {
  const client = requireSupabase()
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError) throw new Error(`Could not read the signed-in user: ${userError.message}`)
  if (!user) throw new Error('Sign in before loading bank data.')

  const { data, error } = await client
    .from('users')
    .select('id, bank_id, email, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw new Error(`Could not load the bank profile: ${error.message}`)

  const profile = asRecord(data)
  if (
    !profile ||
    typeof profile.id !== 'string' ||
    typeof profile.bank_id !== 'string' ||
    typeof profile.email !== 'string' ||
    typeof profile.role !== 'string' ||
    profile.is_active !== true
  ) {
    throw new Error('No active bank profile is configured for this Supabase user.')
  }

  return {
    id: profile.id,
    bank_id: profile.bank_id,
    email: profile.email,
    role: profile.role,
    is_active: true,
  }
}

function parseBankRows(rows: unknown, table: string): BankScopedRecord[] {
  if (!Array.isArray(rows)) {
    throw new Error(`Supabase returned an invalid response for "${table}".`)
  }

  return rows.map((value, index) => {
    const row = asRecord(value)
    if (!row || typeof row.id !== 'string' || typeof row.bank_id !== 'string') {
      throw new Error(`The "${table}" row at position ${index + 1} is missing id or bank_id.`)
    }

    return { ...row, id: row.id, bank_id: row.bank_id }
  })
}

async function getBankRows(
  table: 'existing_rules' | 'delta_analyses' | 'approval_workflows' | 'notifications',
): Promise<BankScopedRecord[]> {
  const client = requireSupabase()
  const profile = await getActiveBankProfile()

  let query = client.from(table).select('*').eq('bank_id', profile.bank_id)
  if (table === 'notifications') {
    query = query.eq('recipient_email', profile.email)
  }

  const { data, error } = await query
  if (error) throw new Error(`Could not load "${table}": ${error.message}`)

  return parseBankRows(data, table)
}

export function getExistingRules() {
  return getBankRows('existing_rules')
}

export function getDeltaAnalyses() {
  return getBankRows('delta_analyses')
}

export function getApprovalWorkflows() {
  return getBankRows('approval_workflows')
}

export function getNotifications() {
  return getBankRows('notifications')
}
