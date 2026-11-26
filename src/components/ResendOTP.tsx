import { useEffect, useState } from 'react'

const RESEND_DELAY = 30

type ResendOTPProps = {
  onResend: () => Promise<boolean>
}

function ResendOTP({ onResend }: ResendOTPProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_DELAY)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (secondsRemaining === 0) return

    const timer = window.setTimeout(() => setSecondsRemaining((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsRemaining])

  async function resend() {
    if (secondsRemaining > 0 || isResending) return

    setIsResending(true)
    try {
      if (await onResend()) setSecondsRemaining(RESEND_DELAY)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="resend-row">
      <span>Didn’t receive a code?</span>
      {secondsRemaining > 0 ? (
        <span className="resend-countdown">Resend in 00:{String(secondsRemaining).padStart(2, '0')}</span>
      ) : (
        <button className="resend-button" type="button" onClick={resend} disabled={isResending}>
          {isResending ? 'Sending…' : 'Resend code'}
        </button>
      )}
    </div>
  )
}

export { ResendOTP }
