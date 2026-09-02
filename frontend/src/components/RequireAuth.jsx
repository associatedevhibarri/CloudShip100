import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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

  if (!user) return <Navigate to="/login" replace />

  // Support operator / admin matching
  const userRole = user.role === 'admin' ? 'operator' : user.role

  if (role && userRole !== role) {
    const fallback =
      userRole === 'customer'
        ? '/customer/deliveries'
        : userRole === 'driver'
          ? '/driver/trips'
          : '/app/dashboard'
    return <Navigate to={fallback} replace />
  }

  return children
}
