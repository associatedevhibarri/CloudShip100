import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

const EMPTY_FINANCE = {
  collected: 0,
  outstanding: 0,
  monthlyCollected: 0,
  byMode: [],
  transactions: [],
}

export default function WalletPage() {
  const [finance, setFinance] = useState(EMPTY_FINANCE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const summary = await api.getFinanceSummary()
        if (!cancelled) {
          setFinance({
            collected: Number(summary?.collected) || 0,
            outstanding: Number(summary?.outstanding) || 0,
            monthlyCollected: Number(summary?.monthlyCollected) || 0,
            byMode: Array.isArray(summary?.byMode) ? summary.byMode : [],
            transactions: Array.isArray(summary?.transactions) ? summary.transactions : [],
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load finance')
          setFinance(EMPTY_FINANCE)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="Loading finance..." />

  return (
    <div>
      <PageHeader
        title="Receivables"
        subtitle="Collected and outstanding amounts from customer invoices."
      />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card tone="brand" className="p-5">
          <p className="text-sm text-white/80">Collected</p>
          <p className="mt-2 text-3xl font-extrabold">${finance.collected.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Outstanding</p>
          <p className="mt-2 text-3xl font-extrabold">${finance.outstanding.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Collected this month</p>
          <p className="mt-2 text-3xl font-extrabold">${finance.monthlyCollected.toLocaleString()}</p>
        </Card>
      </div>

      <Card className="mb-4 p-5">
        <h3 className="mb-3 font-extrabold">Collected by mode</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={finance.byMode}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="road" stackId="1" stroke="#007BFF" fill="#007BFF" fillOpacity={0.7} />
              <Area type="monotone" dataKey="air" stackId="1" stroke="#4DA3FF" fill="#4DA3FF" fillOpacity={0.7} />
              <Area type="monotone" dataKey="maritime" stackId="1" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.7} />
              <Area type="monotone" dataKey="rail" stackId="1" stroke="#64748B" fill="#64748B" fillOpacity={0.7} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {finance.transactions.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">
          No invoices yet. Customer bookings create invoices that appear here.
        </Card>
      ) : (
        <DataTable
          columns={[
            { key: 'date', label: 'Due' },
            { key: 'label', label: 'Invoice' },
            {
              key: 'amount',
              label: 'Amount',
              render: (r) => (
                <span className={r.status === 'Paid' ? 'font-semibold text-emerald-600' : 'font-semibold text-ink'}>
                  ${Math.abs(r.amount).toLocaleString()}
                </span>
              ),
            },
            { key: 'status', label: 'Status' },
          ]}
          rows={finance.transactions}
        />
      )}
    </div>
  )
}
