import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await api.getInvoices()
        if (!cancelled) setInvoices(Array.isArray(rows) ? rows : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load invoices')
          setInvoices([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="Loading invoices..." />

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Billing status for logistics settlements." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      {invoices.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">
          No invoices yet. Invoices created with customer bookings will appear here.
        </Card>
      ) : (
        <DataTable
          columns={[
            { key: 'id', label: 'Invoice' },
            { key: 'customer', label: 'Customer' },
            {
              key: 'amount',
              label: 'Amount',
              render: (r) => `$${r.amount.toLocaleString()}`,
            },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'due', label: 'Due' },
          ]}
          rows={invoices}
        />
      )}
    </div>
  )
}
