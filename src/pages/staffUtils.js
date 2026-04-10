export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Returns 'expired', 'expiring' (within 30 days), or null.
 */
export function accessNiWarning(status, expiryDate) {
  if (status === 'expired') return 'expired'
  if (!expiryDate) return null
  const expiry = new Date(expiryDate)
  const now = new Date()
  const daysLeft = Math.floor((expiry - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0)  return 'expired'
  if (daysLeft <= 30) return 'expiring'
  return null
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}
