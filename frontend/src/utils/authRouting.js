export function normalizeRole(role) {
  return role === 'admin' ? 'operator' : role
}

export function dashboardPathForRole(role) {
  const normalized = normalizeRole(role)
  if (normalized === 'customer') return '/customer/overview'
  if (normalized === 'driver') return '/driver/trips'
  if (normalized === 'operator') return '/app/dashboard'
  return '/'
}

export function signInPathForRole(role) {
  return normalizeRole(role) === 'operator' ? '/ops/login' : '/login'
}
