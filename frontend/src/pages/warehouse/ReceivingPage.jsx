import { useMemo, useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

export default function ReceivingPage() {
  const { data, loading, error, reload } = useWarehouse()
  const parcels = data?.parcels || []
  const [filter, setFilter] = useState('expected')
  const [flash, setFlash] = useState('')
  const [busyId, setBusyId] = useState('')

  const expected = useMemo(() => parcels.filter((p) => p.status === 'expected'), [parcels])
  const receivedToday = useMemo(() => {
    const today = new Date().toDateString()
    return parcels.filter((p) => p.status !== 'expected' && p.receivedAt && new Date(p.receivedAt).toDateString() === today)
  }, [parcels])

  const rows = useMemo(() => {
    if (filter === 'expected') return expected
    if (filter === 'received') return receivedToday
    return parcels
  }, [filter, expected, receivedToday, parcels])

  const receiveOrder = async (parcelId) => {
    setBusyId(parcelId)
    try {
      await api.receiveParcel(parcelId)
      await reload()
      setFlash(`${parcelId} received at the dock. Ready for labelling.`)
    } catch (err) {
      setFlash(err.message || 'Receive failed')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div>
      <PageHeader
        title="Receive orders"
        subtitle="Customer bookings land here as expected inbound. Confirm cargo at the dock before labelling."
      />
      <WarehouseGate loading={loading} error={error}>
        {flash ? (
          <p className="mb-4 rounded-xl border border-brand/20 bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">
            {flash}
          </p>
        ) : null}

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase text-muted">Awaiting receive</p>
            <p className="mt-1 text-2xl font-extrabold">{expected.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase text-muted">Received today</p>
            <p className="mt-1 text-2xl font-extrabold">{receivedToday.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase text-muted">All yard parcels</p>
            <p className="mt-1 text-2xl font-extrabold">{parcels.length}</p>
          </Card>
        </div>

        <FilterBar>
          <FilterButton active={filter === 'expected'} onClick={() => setFilter('expected')}>
            Awaiting receive
          </FilterButton>
          <FilterButton active={filter === 'received'} onClick={() => setFilter('received')}>
            Received today
          </FilterButton>
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            All parcels
          </FilterButton>
        </FilterBar>

        {rows.length === 0 ? (
          <Card className="p-6 text-sm text-muted">
            {filter === 'expected'
              ? 'No orders waiting at the dock. New customer bookings appear here automatically.'
              : 'Nothing in this list yet.'}
          </Card>
        ) : (
          <DataTable
            columns={[
              { key: 'orderId', label: 'Order', render: (r) => r.orderId || '—' },
              { key: 'id', label: 'Parcel' },
              { key: 'client', label: 'Client' },
              { key: 'cargo', label: 'Cargo' },
              {
                key: 'route',
                label: 'Route',
                render: (r) => `${r.pickup} → ${r.dropoff}`,
              },
              { key: 'warehouse', label: 'Yard' },
              {
                key: 'status',
                label: 'Status',
                render: (r) => <StatusBadge status={r.status} />,
              },
              {
                key: 'actions',
                label: '',
                render: (r) =>
                  r.status === 'expected' ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      className="text-sm font-semibold text-brand disabled:opacity-50"
                      onClick={() => receiveOrder(r.id)}
                    >
                      Receive
                    </button>
                  ) : (
                    '—'
                  ),
              },
            ]}
            rows={rows}
          />
        )}
      </WarehouseGate>
    </div>
  )
}
