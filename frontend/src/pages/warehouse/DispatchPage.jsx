import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { LogisticsMap } from '../../components/map/LogisticsMap'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

export default function DispatchPage() {
  const { data, loading, error } = useWarehouse()
  const parcels = data?.parcels || []
  const mapAssets = data?.mapAssets || []
  const [selectedId, setSelectedId] = useState('PCL-1001')
  const selected = parcels.find((p) => p.id === selectedId) || parcels[0]
  const events = (data?.events || []).filter((e) => e.parcelId === selected?.id)

  return (
    <div>
      <PageHeader
        title="Dispatch to Destination"
        subtitle="Yard geofence exit to customer site. Live status for shipper, receiver, and ops."
      />
      <WarehouseGate loading={loading} error={error}>
        {selected ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-muted">In warehouse</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {parcels.filter((p) => p.status === 'received' || p.status === 'labelled').length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-muted">Assigned</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {parcels.filter((p) => p.status === 'assigned').length}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-muted">On the road</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {parcels.filter((p) => p.status === 'dispatched').length}
                </p>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
              <LogisticsMap assets={mapAssets} height="480px" center={[-27.8, 29.2]} zoom={6} />

              <Card className="p-5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-brand">Timeline</p>
                <h3 className="mt-1 text-lg font-extrabold">{selected.id}</h3>
                <p className="text-sm text-muted">
                  {selected.shipper} → {selected.consignee}
                </p>
                <ol className="mt-4 space-y-3">
                  {events.length ? (
                    events.map((e) => (
                      <li key={e.id} className="border-l-2 border-brand/30 pl-3">
                        <p className="text-[11px] font-bold text-brand">{e.time}</p>
                        <p className="text-sm font-extrabold text-ink">{e.title}</p>
                        <p className="text-xs text-muted">{e.detail}</p>
                      </li>
                    ))
                  ) : (
                    <p className="text-sm text-muted">No dispatch events yet — still in yard.</p>
                  )}
                </ol>
              </Card>
            </div>

            <h3 className="mb-3 mt-8 text-lg font-extrabold">All parcels</h3>
            <DataTable
              columns={[
                { key: 'id', label: 'Parcel' },
                { key: 'cargo', label: 'Cargo' },
                { key: 'dropoff', label: 'Destination' },
                {
                  key: 'fleetType',
                  label: 'Capacity',
                  render: (r) => (r.fleetType ? <StatusBadge status={r.fleetType} /> : '—'),
                },
                { key: 'driver', label: 'Driver', render: (r) => r.driver || '—' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (r) => <StatusBadge status={r.status} />,
                },
                {
                  key: 'actions',
                  label: '',
                  render: (r) => (
                    <button
                      type="button"
                      className="text-sm font-semibold text-brand"
                      onClick={() => setSelectedId(r.id)}
                    >
                      Track
                    </button>
                  ),
                },
              ]}
              rows={parcels}
            />
          </>
        ) : null}
      </WarehouseGate>
    </div>
  )
}
