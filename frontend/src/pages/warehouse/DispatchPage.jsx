import { useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { LogisticsMap } from '../../components/map/LogisticsMap'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

export default function DispatchPage() {
  const { data, loading, error, reload } = useWarehouse()
  const parcels = (data?.parcels || []).filter((p) => p.status !== 'expected')
  const mapAssets = data?.mapAssets || []
  const [selectedId, setSelectedId] = useState('PCL-1001')
  const [flash, setFlash] = useState('')
  const [busyId, setBusyId] = useState('')
  const selected = parcels.find((p) => p.id === selectedId) || parcels[0]
  const events = (data?.events || []).filter((e) => e.parcelId === selected?.id)

  const dispatchSelected = async (parcelId) => {
    setBusyId(parcelId)
    try {
      await api.dispatchParcel(parcelId)
      await reload()
      setSelectedId(parcelId)
      setFlash(`${parcelId} left the dispatch bay geofence.`)
    } catch (err) {
      setFlash(err.message || 'Dispatch failed')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div>
      <PageHeader
        title="Dispatch to Destination"
        subtitle="Yard geofence exit to customer site. Live status for shipper, receiver, and ops."
      />
      <WarehouseGate loading={loading} error={error}>
        {selected ? (
          <>
            {flash ? (
              <p className="mb-4 rounded-xl border border-brand/20 bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">
                {flash}
              </p>
            ) : null}

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
                {selected.status === 'assigned' ? (
                  <button
                    type="button"
                    disabled={busyId === selected.id}
                    onClick={() => dispatchSelected(selected.id)}
                    className="mt-4 w-full rounded-full bg-brand-gradient py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Dispatch from yard
                  </button>
                ) : null}
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
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="text-sm font-semibold text-brand"
                        onClick={() => setSelectedId(r.id)}
                      >
                        Track
                      </button>
                      {r.status === 'assigned' ? (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          className="text-sm font-semibold text-brand disabled:opacity-50"
                          onClick={() => dispatchSelected(r.id)}
                        >
                          Dispatch
                        </button>
                      ) : null}
                    </div>
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
