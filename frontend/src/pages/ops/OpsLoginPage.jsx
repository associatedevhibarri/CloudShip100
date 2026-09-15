import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { dashboardPathForRole } from '../../utils/authRouting'
import { OpsAuthShell, opsFieldClass, opsLabelClass } from './OpsAuthShell'

export default function OpsLoginPage() {
  const { user, loading, login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate(dashboardPathForRole(user.role), { replace: true })
    }
  }, [loading, user, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const authenticatedUser = await login(email, password)
      navigate(dashboardPathForRole(authenticatedUser?.role), { replace: true })
    } catch (err) {
      toast.error(err.message || 'Sign in failed. Check your credentials and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <OpsAuthShell
      eyebrow="Operations"
      title="Sign in"
      subtitle="Use your staff credentials to continue."
      footer={
        <Link to="/ops/register" className="font-semibold text-white/70 transition hover:text-white">
          Create an account
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={opsLabelClass} htmlFor="ops-email">
            Email
          </label>
          <input
            id="ops-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={opsFieldClass}
          />
        </div>
        <div>
          <label className={opsLabelClass} htmlFor="ops-password">
            Password
          </label>
          <input
            id="ops-password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={opsFieldClass}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full bg-brand-gradient py-3 text-sm font-bold text-white shadow-md shadow-brand/20 hover:brightness-105 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </OpsAuthShell>
  )
}
