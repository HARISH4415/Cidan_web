export function createWorkflowId() {
  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

  return `WF-${token}`
}
