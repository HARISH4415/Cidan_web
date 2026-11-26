import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CircleHelp, LogOut, Sun } from 'lucide-react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import historyImage from '../assets/history.png'
import { clearDocumentWorkflow } from '../utils/workflowState'
import { EMAIL_STORAGE_KEY } from '../utils/emailState'
import './Header.css'

type HeaderProps = {
  onHistoryClick?: () => void
  historyOpen?: boolean
}

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

function Header({ onHistoryClick, historyOpen = false }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setAuthMessage(`Could not load the signed-in user: ${error.message}`)
          return
        }
        setUser(data.session?.user ?? null)
      })
      .catch((error: unknown) => {
        if (!active) return
        const detail = error instanceof Error ? error.message : 'Unexpected session error.'
        setAuthMessage(`Could not load the signed-in user: ${detail}`)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  async function handleSignOut() {
    if (!supabase || isSigningOut) return

    setIsSigningOut(true)
    setAuthMessage('')
    setMenuOpen(false)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      sessionStorage.removeItem(EMAIL_STORAGE_KEY)
      clearDocumentWorkflow()
      navigate('/login', { replace: true })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unexpected sign-out error.'
      console.error('[Auth] Could not sign out:', detail)
      setAuthMessage(`Could not sign out: ${detail}`)
    } finally {
      setIsSigningOut(false)
    }
  }

  const metadataName = user?.user_metadata.full_name
  const displayName = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : user?.email?.split('@')[0] || 'User'
  const greeting = currentTime.getHours() < 12
    ? 'Good Morning'
    : currentTime.getHours() < 17
      ? 'Good Afternoon'
      : 'Good Evening'
  const userInitial = displayName.charAt(0).toUpperCase()
  const isAuthFlowRoute = location.pathname === '/login' || location.pathname === '/verify-otp'
  const showUserMenu = Boolean(user) && !isAuthFlowRoute

  return (
    <header className="site-header">
      <Link className="brand" to={showUserMenu ? '/upload-document' : '/login'} aria-label="CIDAN home">
        <BrandMark />
        <span className="brand-copy">
          <strong>CIDAN</strong>
          <span>Regulatory Compliance AI</span>
        </span>
      </Link>
      {showUserMenu && (
        <div className="header-actions" ref={userMenuRef}>
          {onHistoryClick && (
            <button
              className={`history-header-button${historyOpen ? ' history-header-button--active' : ''}`}
              type="button"
              onClick={onHistoryClick}
              aria-haspopup="dialog"
              aria-expanded={historyOpen}
            >
              <img src={historyImage} alt="" aria-hidden="true" />
              <span>History</span>
            </button>
          )}
          <div className="user-menu">
            <button
              className="user-menu-trigger"
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="user-account-menu"
              aria-label={`Account menu for ${displayName}`}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="user-profile-icon" aria-hidden="true">{userInitial}</span>
              <span className="user-profile-copy">
                <span className="user-profile-greeting"><Sun size={15} aria-hidden="true" />{greeting}</span>
                <strong className="user-profile-name">{displayName}</strong>
              </span>
              <ChevronDown
                className={menuOpen ? 'user-menu-chevron user-menu-chevron--open' : 'user-menu-chevron'}
                size={16}
                aria-hidden="true"
              />
            </button>
            {menuOpen && (
              <div className="user-menu-dropdown" id="user-account-menu" role="menu">
                {user?.email && (
                  <div className="user-menu-account" title={user.email}>
                    <span>Signed in as</span>
                    <strong>{user.email}</strong>
                  </div>
                )}
                <button
                  className="user-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setHelpOpen(true)
                  }}
                >
                  <CircleHelp size={16} aria-hidden="true" />
                  <span>Help</span>
                </button>
                <button
                  className="user-menu-item user-menu-item--danger"
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {authMessage && <p className="header-auth-message" role="alert">{authMessage}</p>}
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
