import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'
import { useToast } from '../context/ToastContext'

export default function OperatorsPage() {
  const toast = useToast()
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState('')
  const [inviteLinks, setInviteLinks] = useState({})

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await api.getOperators()
      setOperators(Array.isArray(rows) ? rows : [])
    } catch (err) {
      setError(err.message || 'Failed to load operators')
      setOperators([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const rememberLink = (userId, inviteUrl) => {
    if (!userId || !inviteUrl) return
    setInviteLinks((current) => ({ ...current, [userId]: inviteUrl }))
  }

  const copyLink = async (inviteUrl) => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success('Invite link copied. They must set a password from that link.')
    } catch {
      toast.info(inviteUrl)
    }
  }

  const onInvite = async (event) => {
    event.preventDefault()
    setSaving('invite')
    try {
      const result = await api.inviteOperator({ name: name.trim(), email: email.trim() })
      rememberLink(result.user?.id, result.inviteUrl)
      toast.success(result.message || `Invite ready for ${email.trim()}.`)
      if (result.inviteUrl) await copyLink(result.inviteUrl)
      setName('')
      setEmail('')
      await load()
    } catch (err) {
      toast.error(err.message || 'Failed to send invite')
    } finally {
      setSaving('')
    }
  }

  const onResend = async (user) => {
    setSaving(user.id)
    try {
      const result = await api.resendOperatorInvite(user.id)
      rememberLink(user.id, result.inviteUrl)
      toast.success(result.message || `Invite resent to ${user.email}.`)
      if (result.inviteUrl) await copyLink(result.inviteUrl)
    } catch (err) {
      toast.error(err.message || 'Failed to resend invite')
    } finally {
      setSaving('')
    }
  }

  const onVerify = async (user) => {
    setSaving(`verify-${user.id}`)
    try {
      const result = await api.verifyOperatorEmail(user.id)
      rememberLink(user.id, result.inviteUrl)
      toast.success(result.message || `${user.email} marked verified.`)
      if (result.inviteUrl) await copyLink(result.inviteUrl)
      await load()
    } catch (err) {
      toast.error(err.message || 'Failed to verify email')
    } finally {
      setSaving('')
    }
  }

  if (loading) return <LoadingState label="Loading operators..." />

  return (
    <div>
      <PageHeader
        title="Operators"
        subtitle="Invite staff, verify email from here, and copy the set-password link if mail does not arrive."
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="p-5">
          <h3 className="text-lg font-extrabold">Send invite</h3>
          <p className="mt-1 text-sm text-muted">No public operator signup. New ops accounts start from this form.</p>
          <form className="mt-4 space-y-3" onSubmit={onInvite}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Name
              <input
                required
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Priya Ops"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Email
              <input
                required
                type="email"
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@company.com"
              />
            </label>
            <button
              type="submit"
              disabled={Boolean(saving)}
              className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving === 'invite' ? 'Sending...' : 'Send invite link'}
            </button>
          </form>
        </Card>

        <div className="space-y-3">
          {operators.length === 0 && !error ? (
            <Card className="p-8 text-center text-sm text-muted">
              No operators yet. Invite the first extra staff member from the form.
            </Card>
          ) : (
            operators.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-ink">{user.name}</h3>
                    <p className="text-sm text-muted">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={user.role} />
                    <StatusBadge status={user.isEmailVerified ? 'active' : 'pending'} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {user.isEmailVerified
                    ? 'Email verified. They still need a password from the invite link, then they can sign in at /ops/login.'
                    : 'Invite sent. Waiting for them to set a password from the email, or verify them here.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!user.isEmailVerified ? (
                    <button
                      type="button"
                      disabled={Boolean(saving)}
                      className="rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      onClick={() => onVerify(user)}
                    >
                      {saving === `verify-${user.id}` ? 'Verifying...' : 'Verify email'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={Boolean(saving)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                    onClick={() => onResend(user)}
                  >
                    {saving === user.id ? 'Sending...' : 'Resend invite'}
                  </button>
                  {inviteLinks[user.id] ? (
                    <button
                      type="button"
                      className="rounded-full border border-brand px-3 py-1.5 text-xs font-bold text-brand"
                      onClick={() => copyLink(inviteLinks[user.id])}
                    >
                      Copy invite link
                    </button>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
