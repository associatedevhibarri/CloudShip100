import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable } from '../components/ui/DataTable'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await api.getCustomers()
        if (!cancelled) setCustomers(Array.isArray(rows) ? rows : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load customers')
          setCustomers([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="Loading customers..." />

  return (
    <div>
      <PageHeader title="Customers" subtitle="Enterprise accounts and outstanding balances." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Accounts</p>
          <p className="text-2xl font-extrabold">{customers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Outstanding AR</p>
          <p className="text-2xl font-extrabold">
            ${customers.reduce((s, c) => s + c.outstanding, 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Enterprise</p>
          <p className="text-2xl font-extrabold">
            {customers.filter((c) => c.tier === 'Enterprise').length}
          </p>
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
          ]}
          rows={customers}
        />
      )}
    </div>
  )
}
