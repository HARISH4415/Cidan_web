import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { UploadDocumentPage } from './pages/UploadDocumentPage'
import { ComplianceAnalysisPage } from './pages/ComplianceAnalysisPage'
import { DeploymentSuccessPage } from './pages/DeploymentSuccessPage'
import { VerifyOTPPage } from './pages/VerifyOTPPage'
import { SupabaseTest } from './components/SupabaseTest'
import { supabase, supabaseConfigError } from './lib/supabase'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'error'

function useSupabaseSession() {
  const [status, setStatus] = useState<AuthStatus>(() => supabase ? 'checking' : 'error')
  const [errorMessage, setErrorMessage] = useState(
    () => supabaseConfigError ?? 'Supabase is not configured.',
  )

  useEffect(() => {
    if (!supabase) return

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setStatus(session ? 'authenticated' : 'unauthenticated')
    })

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setErrorMessage(error.message)
          setStatus('error')
          return
        }
        setStatus(data.session ? 'authenticated' : 'unauthenticated')
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(error instanceof Error ? error.message : 'Could not verify the Supabase session.')
        setStatus('error')
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return { status, errorMessage }
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, errorMessage } = useSupabaseSession()

  if (status === 'checking') {
    return <main className="auth-check-status" role="status">Checking your Supabase session…</main>
  }

  if (status === 'error') {
    return <main className="auth-check-status" role="alert">{errorMessage}</main>
  }

  return status === 'authenticated' ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useSupabaseSession()

  if (status === 'checking') {
    return <main className="auth-check-status" role="status">Checking your Supabase session…</main>
  }

  return status === 'authenticated' ? <Navigate to="/upload-document" replace /> : <>{children}</>
}

function SessionEntryRedirect() {
  const { status } = useSupabaseSession()

  if (status === 'checking') {
    return <main className="auth-check-status" role="status">Checking your Supabase session…</main>
  }

  return <Navigate to={status === 'authenticated' ? '/upload-document' : '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SessionEntryRedirect />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/verify-otp" element={<VerifyOTPPage />} />
        <Route path="/supabase-test" element={<SupabaseTest />} />
        <Route
          path="/upload-document"
          element={<ProtectedRoute><UploadDocumentPage /></ProtectedRoute>}
        />
        <Route
          path="/compliance-analysis"
          element={<ProtectedRoute><ComplianceAnalysisPage /></ProtectedRoute>}
        />
        <Route
          path="/deployment-success"
          element={<ProtectedRoute><DeploymentSuccessPage /></ProtectedRoute>}
        />
        <Route path="*" element={<SessionEntryRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
