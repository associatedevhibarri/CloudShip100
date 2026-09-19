import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicAuthCard } from '../components/PublicAuthCard'
import { authService } from '../services/authService'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState(token ? 'pending' : 'missing')
  const [message, setMessage] = useState(token ? 'Verifying your email...' : 'This link is missing a token.')

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    ;(async () => {
      try {
        await authService.verifyEmail(token)
        if (!cancelled) {
          setStatus('ok')
          setMessage('Email verified. You can sign in now.')
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setMessage(err.message || 'Verification failed. Request a new email.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <PublicAuthCard
      title={status === 'ok' ? 'Email verified' : 'Verify email'}
      subtitle={message}
      footer={
        <div className="space-x-4">
          <Link to="/login" className="font-semibold text-brand">
            Sign in
          </Link>
          <Link to="/check-email" className="font-semibold text-brand">
            Resend email
          </Link>
        </div>
      }
    />
  )
}
