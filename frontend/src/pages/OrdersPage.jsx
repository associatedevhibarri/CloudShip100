import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

export default function OrdersPage({ filter }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await api.getOrders(filter)
        if (!cancelled) setOrders(Array.isArray(rows) ? rows : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load orders')
          setOrders([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filter])

  const title =
    filter === 'pending' ? 'Pending Orders' : filter === 'history' ? 'Order History' : 'Orders'

  if (loading) return <LoadingState label="Loading orders..." />

  return (
    <div>
      <PageHeader title={title} subtitle="Customer bookings across road, air, and maritime." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Visible orders</p>
          <p className="text-2xl font-extrabold">{orders.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Pipeline value</p>
          <p className="text-2xl font-extrabold">
            ${orders.reduce((s, o) => s + o.value, 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Modes</p>
          <p className="text-2xl font-extrabold">{new Set(orders.map((o) => o.mode)).size}</p>
        </Card>
      </div>
      {orders.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">
          No bookings yet. Customer portal bookings will appear here.
        </Card>
      ) : (
        <DataTable
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'customer', label: 'Customer' },
            { key: 'mode', label: 'Mode' },
            { key: 'cargo', label: 'Cargo' },
            {
              key: 'route',
              label: 'Route',
              render: (r) => `${r.pickup} → ${r.dropoff}`,
            },
            {
              key: 'value',
              label: 'Value',
              render: (r) => `$${r.value.toLocaleString()}`,
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <StatusBadge status={r.status} />,
            },
            { key: 'createdAt', label: 'Created' },
          ]}
          rows={orders}
        />
      )}
    </div>
  )
}
