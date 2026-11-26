import { useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase, supabaseConfigError } from '../lib/supabase'
import './SupabaseTest.css'

type TestStatus = 'idle' | 'loading' | 'success' | 'error'

interface TestResult {
  status: TestStatus
  message: string
}

function getErrorMessage(error: PostgrestError): string {
  const errorText = `${error.code} ${error.message}`.toLowerCase()

  if (/row.level security|rls|violates row.level policy/.test(errorText)) {
    return 'The request was blocked by a Row Level Security policy. Check the table policies for the current role.'
  }

  if (
    error.code === 'PGRST301' ||
    error.code === 'PGRST302' ||
    /invalid api key|invalid jwt|jwt expired|unauthorized|authentication failed/.test(errorText)
  ) {
    return 'Supabase rejected the API key or authentication token. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  }

  if (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /relation .* does not exist|could not find the table/.test(errorText)
  ) {
    return 'The "banks" table was not found. Confirm that it exists in the connected Supabase project and schema.'
  }

  if (error.code === '42501' || /permission denied|not allowed/.test(errorText)) {
    return 'Supabase denied permission to read the "banks" table. Check the grants and access policies.'
  }

  return `The Supabase request failed: ${error.message || 'An unexpected error occurred.'}`
}

function getUnexpectedErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `The Supabase request failed: ${error.message}`
  }

  return 'An unexpected error occurred while testing the Supabase connection.'
}

function SupabaseTest() {
  const [result, setResult] = useState<TestResult>(() =>
    supabaseConfigError
      ? { status: 'error', message: supabaseConfigError }
      : { status: 'idle', message: 'Connection has not been tested yet.' },
  )

  async function testConnection() {
    if (!supabase) {
      const message =
        supabaseConfigError ?? 'Supabase is not configured. Check the Vite environment variables.'
      console.error('[Supabase test] Configuration is missing:', message)
      setResult({ status: 'error', message })
      return
    }

    setResult({ status: 'loading', message: 'Connecting to Supabase…' })

    try {
      const { data, error } = await supabase
        .from('banks')
        .select('id, name')
        .limit(1)

      if (error) {
        const message = getErrorMessage(error)
        console.error('[Supabase test] Query failed:', {
          code: error.code,
          message: error.message,
        })
        setResult({ status: 'error', message })
        return
      }

      console.info('[Supabase test] Query succeeded:', {
        rowCount: data.length,
      })
      setResult({
        status: 'success',
        message:
          data.length > 0
            ? 'Connected successfully. The "banks" query returned a row.'
            : 'Connected successfully, but the query returned no rows. Check table contents or RLS policies if you expected data.',
      })
    } catch (error) {
      const message = getUnexpectedErrorMessage(error)
      console.error('[Supabase test] Unexpected request failure:', message)
      setResult({ status: 'error', message })
    }
  }

  return (
    <main className="supabase-test-page">
      <section className="supabase-test-card" aria-labelledby="supabase-test-heading">
        <span className="supabase-test-eyebrow">Temporary diagnostics</span>
        <h1 id="supabase-test-heading">Supabase Connection Test</h1>
        <p className="supabase-test-description">
          Run a read-only query against the <code>banks</code> table to check the connection.
        </p>

        <button
          className="supabase-test-button"
          type="button"
          onClick={testConnection}
          disabled={result.status === 'loading'}
        >
          {result.status === 'loading' && (
            <span className="supabase-test-spinner" aria-hidden="true" />
          )}
          {result.status === 'loading'
            ? 'Testing connection…'
            : 'Test Supabase Connection'}
        </button>

        <div
          className={`supabase-test-status supabase-test-status--${result.status}`}
          role={result.status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {result.status === 'loading' && (
            <span className="supabase-test-spinner" aria-hidden="true" />
          )}
          <div>
            <strong>
              {result.status === 'idle' && 'Not tested'}
              {result.status === 'loading' && 'Connecting'}
              {result.status === 'success' && 'Connection successful'}
              {result.status === 'error' && 'Connection failed'}
            </strong>
            <p>{result.message}</p>
          </div>
        </div>
      </section>
    </main>
  )
}

export { SupabaseTest }
