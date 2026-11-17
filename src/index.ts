import './index.css'
import './App.css'

export { CidanApp, CidanRoutes } from './App'
export { default } from './App'
export type { CidanAppProps } from './App'

// Pages
export { LoginPage } from './pages/LoginPage'
export { VerifyOTPPage } from './pages/VerifyOTPPage'
export { UploadDocumentPage } from './pages/UploadDocumentPage'
export { ComplianceAnalysisPage } from './pages/ComplianceAnalysisPage'
export { DeploymentSuccessPage } from './pages/DeploymentSuccessPage'

// Components
export { AIChatbot } from './components/AIChatbot'
export { DocumentUpload } from './components/DocumentUpload'
export { EmailVerificationIllustration } from './components/EmailVerificationIllustration'
export { Header } from './components/Header'
export { Hero } from './components/Hero'
export { LoginForm } from './components/LoginForm'
export { OTPInput } from './components/OTPInput'
export { PDFReportPreview } from './components/PDFReportPreview'
export { ResendOTP } from './components/ResendOTP'
export { SecurityNotice } from './components/SecurityNotice'
export { SelectedFileCard } from './components/SelectedFileCard'

// Utils & Services
export * from './services/pdfReportService'
export * from './utils/emailState'
export * from './utils/mockOtp'
export * from './utils/workflowId'
export * from './utils/workflowState'
