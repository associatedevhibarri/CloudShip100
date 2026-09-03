import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  const [busy, setBusy] = useState('')

  const run = async (key, work, okMessage) => {
    setBusy(key)
    try {
      await work()
      await reload()
      setNote(okMessage)
    } catch (err) {
      setNote(err.message || 'Route action failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <div>
      <PageHeader
        title="Route Optimisation"
        subtitle="Baseline vs optimised hours, fuel save, and automated parcel-to-route assignment."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/app/geo-analytics" className="text-sm font-bold text-brand hover:underline">
              Geo analytics →
            </Link>
            <button
              type="button"
              disabled={busy === 'auto'}
              onClick={() =>
                run('auto', () => api.autoAssignRoutes(), 'Suggested SADC and coastal routes applied to open parcels.')
              }
              className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50"
            >
              Auto-assign suggested routes
            </button>
          </div>
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
              {r.distanceKm ? (
                <p className="mt-2 text-xs font-semibold text-muted">
                  {r.distanceKm} km · {r.durationMinutes} min
                </p>
              ) : null}
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
              <p className="mt-3 text-xs text-muted">Parcels: {(r.parcelIds || []).join(', ') || 'None yet'}</p>
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => run(r.id, () => api.optimizeRoute(r.id), `Optimised ${r.name}`)}
                className="mt-4 w-full rounded-full border border-line py-2 text-sm font-bold text-ink disabled:opacity-50"
              >
                Optimise this lane
              </button>
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
              render: (r) => `${((r.baselineHrs || 0) - (r.optimizedHrs || 0)).toFixed(1)} h`,
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
