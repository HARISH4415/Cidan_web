import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AIChatbot } from '../components/AIChatbot'
import { EmailVerificationIllustration } from '../components/EmailVerificationIllustration'
import { Header } from '../components/Header'
import { OTPInput } from '../components/OTPInput'
import { ResendOTP } from '../components/ResendOTP'
import { SecurityNotice } from '../components/SecurityNotice'
import { supabase, supabaseConfigError } from '../lib/supabase'
import { recordSuccessfulLogin } from '../services/userHistoryService'
import { EMAIL_STORAGE_KEY, getEmailFromNavigationState, isEmailAddress } from '../utils/emailState'
import './VerifyOTPPage.css'

function VerifyOTPPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = getEmailFromNavigationState(location.state)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoginVerified, setIsLoginVerified] = useState(false)
  const [isHistorySaved, setIsHistorySaved] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'notice'; text: string } | null>(null)

  useEffect(() => {
    if (!isEmailAddress(email)) {
      navigate('/login', { replace: true })
      return
    }
    if (!supabase || isLoginVerified) return

    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        navigate('/upload-document', { replace: true })
      }
    })

    return () => {
      active = false
    }
  }, [email, isLoginVerified, navigate])

  if (!isEmailAddress(email)) return null

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.length !== 6) {
      setFeedback({ type: 'error', text: 'Enter all six digits to continue.' })
      return
    }

    setFeedback(null)
    if (!supabase) {
      setFeedback({
        type: 'error',
        text: supabaseConfigError ?? 'Supabase is not configured. Check the environment variables.',
      })
      return
    }

    setIsLoading(true)
    let otpVerified = false
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })

      if (error) throw error
      if (!data.session) {
        throw new Error('Supabase verified the code but did not return an authenticated session.')
      }

      otpVerified = true
      setIsLoginVerified(true)
      sessionStorage.setItem(EMAIL_STORAGE_KEY, email)
      await recordLoginAndContinue()
    } catch (error) {
      if (otpVerified) {
        return
      }

      const detail = error instanceof Error ? error.message : 'Unexpected authentication error.'
      console.error('[Auth] Could not verify email OTP:', detail)
      setFeedback({ type: 'error', text: 'The code could not be verified. Check it and try again, or request a new code.' })
    } finally {
      setIsLoading(false)
    }
  }

  async function recordLoginAndContinue() {
    try {
      await recordSuccessfulLogin()
      setIsHistorySaved(true)
      setFeedback({ type: 'success', text: 'Email verified successfully.' })
      window.setTimeout(() => navigate('/upload-document', { replace: true }), 450)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unexpected history error.'
      console.error('[History] Could not record successful login:', detail)
      setFeedback({
        type: 'error',
        text: 'Your email is verified, but the login history could not be saved. Check the user_history table and its RLS policies, then retry.',
      })
    }
  }

  async function handleRetryHistory() {
    setIsLoading(true)
    await recordLoginAndContinue()
    setIsLoading(false)
  }

  async function handleResend(): Promise<boolean> {
    if (!supabase) {
      setFeedback({
        type: 'error',
        text: supabaseConfigError ?? 'Supabase is not configured. Check the environment variables.',
      })
      return false
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (error) throw error

      setCode('')
      setFeedback({ type: 'notice', text: 'A new verification code was sent.' })
      return true
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unexpected authentication error.'
      console.error('[Auth] Could not resend email OTP:', detail)
      setFeedback({ type: 'error', text: 'Could not resend the code. Check Supabase Auth email delivery settings and try again.' })
      return false
    }
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
          <p className="verify-instructions">Enter the 6-digit code sent to</p>
          <p className="verify-email">{email}</p>

          <form className="verify-form" onSubmit={handleVerify}>
            <label className="otp-label" htmlFor="verification-digit-1">Enter verification code</label>
            {!isLoginVerified && (
              <OTPInput
                value={code}
                onChange={(nextCode) => {
                  setCode(nextCode)
                  setFeedback(null)
                }}
                invalid={feedback?.type === 'error'}
              />
            )}
            <div className="otp-hint">
              {isLoginVerified
                ? 'Your email is verified. Save the login history entry to continue.'
                : 'The code expires according to your Supabase Auth email settings.'}
            </div>
            {!isLoginVerified && <ResendOTP onResend={handleResend} />}
            <div className="otp-feedback" aria-live="polite">
              {feedback && (
                <p className={`otp-message otp-message--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
                  {feedback.text}
                </p>
              )}
            </div>
            {isLoginVerified && !isHistorySaved ? (
              <button
                className="verify-button"
                type="button"
                onClick={handleRetryHistory}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="button-spinner" size={17} aria-hidden="true" />
                    Saving login history…
                  </>
                ) : (
                  <>
                    Retry saving history
                    <ArrowRight size={18} aria-hidden="true" />
                  </>
                )}
              </button>
            ) : isLoginVerified ? (
              <p className="otp-message otp-message--success" role="status">Login history saved. Redirecting…</p>
            ) : (
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
            )}
          </form>

          <SecurityNotice />
        </section>
      </div>
      <AIChatbot />
    </main>
  )
}

export { VerifyOTPPage }
