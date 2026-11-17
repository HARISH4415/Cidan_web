import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, LoaderCircle, Mail, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EMAIL_STORAGE_KEY, VERIFIED_SESSION_KEY, getEmailFromNavigationState, isEmailAddress } from '../utils/emailState'
import './LoginForm.css'

function LoginForm() {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => getEmailFromNavigationState(location.state))
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = emailRef.current
    if (!input) return

    const normalizedEmail = email.trim()
    if (!isEmailAddress(normalizedEmail)) {
      setMessageType('error')
      setMessage('Enter a valid bank email address to continue.')
      input.focus()
      return
    }

    setMessage('')
    setMessageType('')
    setIsLoading(true)
    sessionStorage.removeItem(VERIFIED_SESSION_KEY)
    window.setTimeout(() => {
      sessionStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail)
      navigate('/verify-otp', { state: { email: normalizedEmail } })
    }, 450)
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    sessionStorage.setItem(EMAIL_STORAGE_KEY, value)
    sessionStorage.removeItem(VERIFIED_SESSION_KEY)
    setMessage('')
    setMessageType('')
  }

  return (
    <section className="login-section" aria-labelledby="login-title">
      <div className="login-card">
        <div className="card-kicker"><span /> SECURE PORTAL</div>
        <h2 id="login-title">Login with your bank email</h2>
        <p className="login-description">Enter your official bank email to continue to secure verification</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="input-label" htmlFor="bank-email">Bank email address</label>
          <div className={`email-field${messageType === 'error' ? ' has-error' : ''}`}>
            <span className="email-icon" aria-hidden="true">
              <Mail size={17} />
            </span>
            <input
              ref={emailRef}
              id="bank-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@yourbank.com"
              value={email}
              onChange={(event) => handleEmailChange(event.target.value)}
              aria-invalid={messageType === 'error'}
              aria-describedby={message ? 'form-message' : undefined}
              required
            />
          </div>

          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoaderCircle className="button-spinner" size={16} aria-hidden="true" />
                Preparing verification…
              </>
            ) : (
              <>
                Send OTP Code
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
          <div className="feedback-slot" aria-live="polite">
            {message && (
              <p id="form-message" className={`form-message ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>
                {message}
              </p>
            )}
          </div>
        </form>

        <div className="security-note">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>Your information is encrypted and securely protected.</span>
        </div>
      </div>
    </section>
  )
}

export { LoginForm }
