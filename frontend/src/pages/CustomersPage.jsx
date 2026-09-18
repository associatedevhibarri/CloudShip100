import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable } from '../components/ui/DataTable'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'
import { useToast } from '../context/ToastContext'

export default function CustomersPage() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')
  const [verifyLinks, setVerifyLinks] = useState({})

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await api.getCustomers()
      setCustomers(Array.isArray(rows) ? rows : [])
    } catch (err) {
      setError(err.message || 'Failed to load customers')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const copyLink = async (url) => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Verification link copied.')
    } catch {
      toast.info(url)
    }
  }

  const onVerify = async (row) => {
    if (!row.ownerId) {
      toast.error('This company has no owner account to verify.')
      return
    }
    setSaving(`verify-${row.id}`)
    try {
      const result = await api.verifyCustomerEmail(row.ownerId)
      toast.success(result.message || `${row.email} marked verified. They can sign in now.`)
      await load()
    } catch (err) {
      toast.error(err.message || 'Failed to verify email')
    } finally {
      setSaving('')
    }
  }

  const onResend = async (row) => {
    if (!row.ownerId) {
      toast.error('This company has no owner account.')
      return
    }
    setSaving(`resend-${row.id}`)
    try {
      const result = await api.resendCustomerVerify(row.ownerId)
      if (result.verifyUrl) {
        setVerifyLinks((current) => ({ ...current, [row.id]: result.verifyUrl }))
        await copyLink(result.verifyUrl)
      }
      toast.success(result.message || `Verification resent to ${row.email}.`)
    } catch (err) {
      toast.error(err.message || 'Failed to resend verification')
    } finally {
      setSaving('')
    }
  }

  if (loading) return <LoadingState label="Loading customers..." />

  const pending = customers.filter((c) => !c.isEmailVerified).length

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Enterprise accounts. Verify email here if the signup mail did not arrive — they can then sign in with the password they chose."
      />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Accounts</p>
          <p className="text-2xl font-extrabold">{customers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Pending verify</p>
          <p className="text-2xl font-extrabold">{pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Outstanding AR</p>
          <p className="text-2xl font-extrabold">
            ${customers.reduce((s, c) => s + c.outstanding, 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Enterprise</p>
          <p className="text-2xl font-extrabold">{customers.filter((c) => c.tier === 'Enterprise').length}</p>
        </Card>
      </div>
      {customers.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">
          No customer companies yet. Accounts created in the customer portal will appear here.
        </Card>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Customer' },
            { key: 'contact', label: 'Contact' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'tier', label: 'Tier' },
            {
              key: 'outstanding',
              label: 'Outstanding',
              render: (r) => `$${r.outstanding.toLocaleString()}`,
            },
            {
              key: 'isEmailVerified',
              label: 'Email',
              render: (r) => <StatusBadge status={r.isEmailVerified ? 'active' : 'pending'} />,
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <div className="flex flex-wrap gap-2">
                  {!r.isEmailVerified ? (
                    <button
                      type="button"
                      disabled={Boolean(saving)}
                      className="rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      onClick={() => onVerify(r)}
                    >
                      {saving === `verify-${r.id}` ? 'Verifying...' : 'Verify email'}
                    </button>
                  ) : null}
                  {!r.isEmailVerified ? (
                    <button
                      type="button"
                      disabled={Boolean(saving)}
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      onClick={() => onResend(r)}
                    >
                      {saving === `resend-${r.id}` ? 'Sending...' : 'Resend link'}
                    </button>
                  ) : null}
                  {verifyLinks[r.id] ? (
                    <button
                      type="button"
                      className="rounded-full border border-brand px-3 py-1.5 text-xs font-bold text-brand"
                      onClick={() => copyLink(verifyLinks[r.id])}
                    >
                      Copy link
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
          rows={customers}
        />
      )}
    </div>
  )
}
