import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { dashboardPathForRole } from '../../utils/authRouting'
import { OpsAuthShell, opsFieldClass, opsLabelClass } from './OpsAuthShell'

export default function OpsRegisterPage() {
  const { user, loading, register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [name, setName] = useState('')
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
      const newUser = await register(name, email, password, 'operator')
      navigate(dashboardPathForRole(newUser?.role || 'operator'), { replace: true })
    } catch (err) {
      toast.error(err.message || 'Could not create the account. Try a different email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <OpsAuthShell
      eyebrow="Operations"
      title="Create an account"
      subtitle="Enter your details to get started."
      footer={
        <Link to="/ops/login" className="font-semibold text-white/70 transition hover:text-white">
          Already have an account? Sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={opsLabelClass} htmlFor="ops-name">
            Full name
          </label>
          <input
            id="ops-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            className={opsFieldClass}
          />
        </div>
        <div>
          <label className={opsLabelClass} htmlFor="ops-reg-email">
            Email
          </label>
          <input
            id="ops-reg-email"
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
          <label className={opsLabelClass} htmlFor="ops-reg-password">
            Password
          </label>
          <input
            id="ops-reg-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={opsFieldClass}
          />
          <p className="mt-1 text-[11px] text-white/35">
            At least 8 characters, with 1 letter and 1 number.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full bg-brand-gradient py-3 text-sm font-bold text-white shadow-md shadow-brand/20 hover:brightness-105 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </OpsAuthShell>
  )
}
