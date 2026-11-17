import type { CSSProperties } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useInRouterContext } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { UploadDocumentPage } from './pages/UploadDocumentPage'
import { ComplianceAnalysisPage } from './pages/ComplianceAnalysisPage'
import { DeploymentSuccessPage } from './pages/DeploymentSuccessPage'
import { VerifyOTPPage } from './pages/VerifyOTPPage'
import { VERIFIED_SESSION_KEY } from './utils/emailState'

export interface CidanAppProps {
  basename?: string
  className?: string
  style?: CSSProperties
}

function ProtectedUploadDocument() {
  if (sessionStorage.getItem(VERIFIED_SESSION_KEY) !== 'true') {
    return <Navigate to="/login" replace />
  }

  return <UploadDocumentPage />
}

function ProtectedComplianceAnalysis() {
  if (sessionStorage.getItem(VERIFIED_SESSION_KEY) !== 'true') {
    return <Navigate to="/login" replace />
  }

  return <ComplianceAnalysisPage />
}

function ProtectedDeploymentSuccess() {
  if (sessionStorage.getItem(VERIFIED_SESSION_KEY) !== 'true') {
    return <Navigate to="/login" replace />
  }

  return <DeploymentSuccessPage />
}

export function CidanRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-otp" element={<VerifyOTPPage />} />
      <Route
        path="/upload-document"
        element={<ProtectedUploadDocument />}
      />
      <Route
        path="/compliance-analysis"
        element={<ProtectedComplianceAnalysis />}
      />
      <Route
        path="/deployment-success"
        element={<ProtectedDeploymentSuccess />}
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export function CidanApp({ basename, className, style }: CidanAppProps) {
  const isInRouter = useInRouterContext()

  const content = (
    <div className={`cidan-app-container ${className || ''}`} style={style}>
      <CidanRoutes />
    </div>
  )

  if (isInRouter) {
    return content
  }

  return (
    <BrowserRouter basename={basename}>
      {content}
    </BrowserRouter>
  )
}

export default CidanApp
