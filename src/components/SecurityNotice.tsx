import { LockKeyhole } from 'lucide-react'

function SecurityNotice() {
  return (
    <aside className="otp-security-notice">
      <span className="otp-security-icon"><LockKeyhole size={17} aria-hidden="true" /></span>
      <span className="otp-security-copy">
        <strong>This code will expire in 5 minutes.</strong>
        <span>For your security, please do not share this code with anyone.</span>
      </span>
    </aside>
  )
}

export { SecurityNotice }
