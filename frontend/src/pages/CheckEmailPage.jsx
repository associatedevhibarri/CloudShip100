import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicAuthCard, publicFieldClass, publicLabelClass } from '../components/PublicAuthCard'
import { authService } from '../services/authService'
import { useToast } from '../context/ToastContext'

export default function CheckEmailPage() {
  const toast = useToast()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await authService.resendVerification(email)
      toast.success('If that account exists, we sent a verification email.')
    } catch (err) {
      toast.error(err.message || 'Could not resend verification email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PublicAuthCard
      title="Check your email"
      subtitle="Verify your address before signing in. You can resend the email if it did not arrive."
      footer={
        <Link to="/login" className="font-semibold text-brand">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={publicLabelClass} htmlFor="check-email">
            Email
          </label>
          <input
            id="check-email"
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
          {isSubmitting ? 'Sending...' : 'Resend verification email'}
        </button>
      </form>
    </PublicAuthCard>
  )
}
