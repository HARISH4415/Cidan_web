import { useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Header.css'

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 42 42" aria-hidden="true">
      <path d="M21 2.8 38.3 12.9v16.2L21 39.2 3.7 29.1V12.9L21 2.8Z" fill="#EFEDFF" />
      <path d="m21 2.8 17.3 10.1L21 23 3.7 12.9 21 2.8Z" fill="#7650F5" />
      <path d="M3.7 12.9 21 23v16.2L3.7 29.1V12.9Z" fill="#4565F5" />
      <path d="M38.3 12.9 21 23v16.2l17.3-10.1V12.9Z" fill="#5A5FF5" />
      <path d="m21 2.8 17.3 10.1v16.2L21 39.2 3.7 29.1V12.9L21 2.8Z" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function Header() {
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <header className="site-header">
      <Link className="brand" to="/login" aria-label="CIDAN home">
        <BrandMark />
        <span className="brand-copy">
          <strong>CIDAN</strong>
          <span>Regulatory Compliance AI</span>
        </span>
      </Link>
      <div className="header-actions">
        <button className="help-button" type="button" onClick={() => setHelpOpen(true)}>
          <CircleHelp size={17} aria-hidden="true" />
          Help
        </button>
      </div>
      {helpOpen && (
        <div className="help-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setHelpOpen(false)
        }}>
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
            <button className="help-close" type="button" onClick={() => setHelpOpen(false)} aria-label="Close help">
              <span aria-hidden="true">×</span>
            </button>
            <div className="help-dialog-icon" aria-hidden="true">?</div>
            <h2 id="help-title">Need a hand?</h2>
            <p>Use your official bank email address to access CIDAN. For assistance with account access, contact your institution’s compliance administrator.</p>
            <button className="help-done" type="button" onClick={() => setHelpOpen(false)}>Got it</button>
          </section>
        </div>
      )}
    </header>
  )
}

export { BrandMark, Header }
