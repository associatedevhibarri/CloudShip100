import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dashboardPathForRole, normalizeRole, signInPathForRole } from '../utils/authRouting'

export function RequireAuth({ role, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
          <p className="text-xs font-semibold text-muted">Verifying session...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to={signInPathForRole(role)} replace />

  const userRole = normalizeRole(user.role)

  if (role && userRole !== role) {
    return <Navigate to={dashboardPathForRole(userRole)} replace />
  }

  return children
}
