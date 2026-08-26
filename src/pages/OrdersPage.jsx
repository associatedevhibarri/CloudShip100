import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Card } from '../components/ui/Card'

export default function OrdersPage({ filter }) {
  const orders = api.getOrders(filter)
  const title =
    filter === 'pending' ? 'Pending Orders' : filter === 'history' ? 'Order History' : 'Orders'

  return (
    <div>
      <PageHeader title={title} subtitle="Customer bookings across road, air, and maritime." />
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
    </div>
  )
}
