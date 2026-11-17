import { useEffect, useState } from 'react'

const RESEND_DELAY = 30

type ResendOTPProps = {
  onResend: () => void
}

function ResendOTP({ onResend }: ResendOTPProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_DELAY)

  useEffect(() => {
    if (secondsRemaining === 0) return

    const timer = window.setTimeout(() => setSecondsRemaining((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsRemaining])

  function resend() {
    if (secondsRemaining > 0) return
    onResend()
    setSecondsRemaining(RESEND_DELAY)
  }

  return (
    <div className="resend-row">
      <span>Didn’t receive a code?</span>
      {secondsRemaining > 0 ? (
        <span className="resend-countdown">Resend in 00:{String(secondsRemaining).padStart(2, '0')}</span>
      ) : (
        <button className="resend-button" type="button" onClick={resend}>Resend code</button>
      )}
    </div>
  )
}

export { ResendOTP }
