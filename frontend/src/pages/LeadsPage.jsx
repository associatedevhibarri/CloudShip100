import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

function formatWhen(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await api.getLeads()
        if (!cancelled) setLeads(Array.isArray(rows) ? rows : [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load leads')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="Loading leads..." />

  const newCount = leads.filter((l) => l.status === 'new').length

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Demo requests submitted from the Cloud Ship landing page."
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Total leads</p>
          <p className="text-2xl font-extrabold">{leads.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">New</p>
          <p className="text-2xl font-extrabold">{newCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Contacted / closed</p>
          <p className="text-2xl font-extrabold">{leads.length - newCount}</p>
        </Card>
      </div>

      {leads.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">
          No leads yet. Submit the form on the Home page to see entries here.
        </Card>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'company', label: 'Company' },
            {
              key: 'message',
              label: 'Message',
              render: (r) => (
                <span className="line-clamp-2 max-w-xs text-muted">{r.message}</span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold uppercase text-brand">
                  {r.status || 'new'}
                </span>
              ),
            },
            {
              key: 'createdAt',
              label: 'Submitted',
              render: (r) => formatWhen(r.createdAt),
            },
          ]}
          rows={leads}
        />
      )}
    </div>
  )
}
