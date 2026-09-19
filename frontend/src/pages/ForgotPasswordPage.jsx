import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicAuthCard, publicFieldClass, publicLabelClass } from '../components/PublicAuthCard'
import { authService } from '../services/authService'
import { useToast } from '../context/ToastContext'

export default function ForgotPasswordPage() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (err) {
      toast.error(err.message || 'Could not send reset email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sent) {
    return (
      <PublicAuthCard
        title="Check your email"
        subtitle="If that address is registered, we sent a password reset link."
        footer={
          <Link to="/login" className="font-semibold text-brand">
            Back to sign in
          </Link>
        }
      />
    )
  }

  return (
    <PublicAuthCard title="Forgot password" subtitle="Enter your email and we will send a reset link.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={publicLabelClass} htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={publicFieldClass}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-brand-gradient py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </PublicAuthCard>
  )
}
