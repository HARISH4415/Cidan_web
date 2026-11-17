import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AIChatbot } from '../components/AIChatbot'
import { EmailVerificationIllustration } from '../components/EmailVerificationIllustration'
import { Header } from '../components/Header'
import { OTPInput } from '../components/OTPInput'
import { ResendOTP } from '../components/ResendOTP'
import { SecurityNotice } from '../components/SecurityNotice'
import { VERIFIED_SESSION_KEY, getEmailFromNavigationState, isEmailAddress } from '../utils/emailState'
import { DEMO_OTP, verifyMockOTP } from '../utils/mockOtp'
import './VerifyOTPPage.css'

function VerifyOTPPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = getEmailFromNavigationState(location.state)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'notice'; text: string } | null>(null)

  useEffect(() => {
    if (!isEmailAddress(email)) {
      navigate('/login', { replace: true })
    }
  }, [email, navigate])

  if (!isEmailAddress(email)) return null

  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.length !== 6) {
      setFeedback({ type: 'error', text: 'Enter all six digits to continue.' })
      return
    }

    setFeedback(null)
    setIsLoading(true)
    window.setTimeout(() => {
      setIsLoading(false)
      if (verifyMockOTP(code)) {
        sessionStorage.setItem(VERIFIED_SESSION_KEY, 'true')
        setFeedback({ type: 'success', text: 'Demo verification successful. No backend verification was performed.' })
        window.setTimeout(() => navigate('/upload-document', { replace: true }), 450)
        return
      }

      setFeedback({ type: 'error', text: 'That code does not match the demo code. Please try again.' })
    }, 650)
  }

  function handleResend() {
    setCode('')
    setFeedback({ type: 'notice', text: 'Demo code is ready again. No email was sent.' })
  }

  return (
    <main className="verify-page">
      <Header />
      <div className="verify-layout">
        <section className="verify-visual" aria-label="Email verification">
          <EmailVerificationIllustration />
          <div className="verify-visual-caption">
            <span className="verify-caption-mark" aria-hidden="true">✦</span>
            <span>One more step to secure your workspace</span>
          </div>
        </section>

        <section className="verify-card" aria-labelledby="verify-title">
          <button
            className="verify-back"
            type="button"
            aria-label="Back to login"
            onClick={() => navigate('/login', { state: { email } })}
          >
            <ArrowLeft size={21} aria-hidden="true" />
          </button>
          <h1 id="verify-title">Verify your <span>email</span></h1>
          <p className="verify-instructions">Use the 6-digit demo code for</p>
          <p className="verify-email">{email}</p>

          <form className="verify-form" onSubmit={handleVerify}>
            <label className="otp-label" htmlFor="verification-digit-1">Enter verification code</label>
            <OTPInput
              value={code}
              onChange={(nextCode) => {
                setCode(nextCode)
                setFeedback(null)
              }}
              invalid={feedback?.type === 'error'}
            />
            <div className="demo-hint">
              Frontend demo · code <strong>{DEMO_OTP}</strong> · no email was sent
            </div>
            <ResendOTP onResend={handleResend} />
            <div className="otp-feedback" aria-live="polite">
              {feedback && (
                <p className={`otp-message otp-message--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
                  {feedback.text}
                </p>
              )}
            </div>
            <button className="verify-button" type="submit" disabled={code.length !== 6 || isLoading}>
              {isLoading ? (
                <>
                  <LoaderCircle className="button-spinner" size={17} aria-hidden="true" />
                  Checking code…
                </>
              ) : (
                <>
                  Verify OTP
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <SecurityNotice />
        </section>
      </div>
      <AIChatbot />
    </main>
  )
}

export { VerifyOTPPage }
