import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicAuthCard, publicFieldClass, publicLabelClass } from '../components/PublicAuthCard'
import { authService } from '../services/authService'
import { useToast } from '../context/ToastContext'

export default function ResetPasswordPage() {
  const toast = useToast()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const nextPath = params.get('next') === 'ops' ? '/ops/login' : '/login'
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('This reset link is missing a token.')
      return
    }
    setIsSubmitting(true)
    try {
      await authService.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      toast.error(err.message || 'Password reset failed. Request a new link.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <PublicAuthCard
        title="Password updated"
        subtitle="You can sign in with your new password."
        footer={
          <Link to={nextPath} className="font-semibold text-brand">
            {nextPath === '/ops/login' ? 'Sign in to operations' : 'Sign in'}
          </Link>
        }
      />
    )
  }

  return (
    <PublicAuthCard title="Set a new password" subtitle="Choose a password with at least 8 characters, 1 letter and 1 number.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={publicLabelClass} htmlFor="reset-password">
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={publicFieldClass}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !token}
          className="w-full rounded-full bg-brand-gradient py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Update password'}
        </button>
      </form>
    </PublicAuthCard>
  )
}
