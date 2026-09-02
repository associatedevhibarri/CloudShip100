import { useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

export default function WarehouseRoutesPage() {
  const { data, loading, error, reload } = useWarehouse()
  const routes = data?.routes || []
  const [note, setNote] = useState('')

  const autoAssignRoutes = async () => {
    await api.autoAssignRoutes()
    await reload()
    setNote('Suggested SADC and coastal routes applied to open parcels.')
  }

  return (
    <div>
      <PageHeader
        title="Route Optimisation"
        subtitle="Baseline vs optimised hours, fuel save, and automated parcel-to-route assignment."
        actions={
          <button
            type="button"
            onClick={autoAssignRoutes}
            className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white shadow-sm"
          >
            Auto-assign suggested routes
          </button>
        }
      />
      <WarehouseGate loading={loading} error={error}>
        {note ? (
          <p className="mb-4 rounded-xl border border-brand/20 bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">
            {note}
          </p>
        ) : null}

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {routes.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-brand">{r.id}</p>
                  <h3 className="text-lg font-extrabold">{r.name}</h3>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={r.fleetType} />
                  <StatusBadge status={r.status} />
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Baseline</dt>
                  <dd className="font-extrabold">{r.baselineHrs}h</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Optimised</dt>
                  <dd className="font-extrabold text-brand">{r.optimizedHrs}h</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Fuel</dt>
                  <dd className="font-extrabold">−{r.fuelSavePct}%</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs font-semibold uppercase text-muted">Stops</p>
              <ol className="mt-1 flex flex-wrap gap-1.5">
                {(r.stops || []).map((stop) => (
                  <li
                    key={stop}
                    className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink"
                  >
                    {stop}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted">Parcels: {(r.parcelIds || []).join(', ')}</p>
            </Card>
          ))}
        </div>

        <DataTable
          columns={[
            { key: 'id', label: 'Route' },
            { key: 'name', label: 'Lane' },
            {
              key: 'save',
              label: 'Hours saved',
              render: (r) => `${(r.baselineHrs - r.optimizedHrs).toFixed(1)} h`,
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <StatusBadge status={r.status} />,
            },
          ]}
          rows={routes}
        />
      </WarehouseGate>
    </div>
  )
}
