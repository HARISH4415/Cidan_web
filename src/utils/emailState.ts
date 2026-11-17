export const EMAIL_STORAGE_KEY = 'cidan-email'
export const VERIFIED_SESSION_KEY = 'cidan-email-verified'

export function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function getEmailFromNavigationState(state: unknown) {
  if (state && typeof state === 'object' && 'email' in state && typeof state.email === 'string') {
    return state.email
  }

  return sessionStorage.getItem(EMAIL_STORAGE_KEY) ?? ''
}
