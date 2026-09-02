import { useMemo, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../components/ui/FilterBar'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { DataTable } from '../components/ui/DataTable'

function TripQueue({ title, items, tone }) {
  return (
    <Card className={`p-4 ${tone}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-extrabold text-ink">{title}</h3>
        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-brand">
          {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 4).map((trip) => (
          <li key={trip.id} className="rounded-xl border border-line/80 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">{trip.id}</p>
              <StatusBadge status={trip.status} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {trip.driver} · {trip.vehicle}
            </p>
            <p className="mt-1 truncate text-xs text-ink">
              {trip.pickup} → {trip.dropoff}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function TripsPage() {
  const trips = api.getTrips()
  const [mode, setMode] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(
    () => (mode === 'all' ? trips : trips.filter((t) => t.mode === mode)),
    [trips, mode],
  )

  const starting = filtered.filter((t) => t.status === 'starting_soon')
  const ending = filtered.filter((t) => t.status === 'ending_soon')
  const progress = filtered.filter((t) => t.status === 'in_progress')

  const columns = [
    { key: 'id', label: 'Trip' },
    { key: 'driver', label: 'Driver' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'cargo', label: 'Cargo' },
    {
      key: 'route',
      label: 'Pickup → Dropoff',
      render: (row) => (
        <span className="block max-w-xs truncate text-xs">
          {row.pickup} → {row.dropoff}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          type="button"
          className="text-sm font-semibold text-brand"
          onClick={() => setSelected(row)}
        >
          Details
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Trips"
        subtitle="Driver + vehicle + cargo with live starting, ending, and in-progress queues."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Starting soon</p>
          <p className="mt-1 text-2xl font-extrabold">{starting.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Ending soon</p>
          <p className="mt-1 text-2xl font-extrabold">{ending.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">In progress</p>
          <p className="mt-1 text-2xl font-extrabold">{progress.length}</p>
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <TripQueue title="Trips Starting Soon" items={starting} tone="bg-sky-50/50" />
        <TripQueue title="Trips Ending Soon" items={ending} tone="bg-orange-50/50" />
        <TripQueue title="Trips in Progress" items={progress} tone="bg-brand-light/40" />
      </div>

      <FilterBar>
        {['all', 'road', 'air', 'maritime'].map((m) => (
          <FilterButton key={m} active={mode === m} onClick={() => setMode(m)}>
            {m === 'all' ? 'All modes' : m}
          </FilterButton>
        ))}
      </FilterBar>

      <DataTable columns={columns} rows={filtered} />

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/30 backdrop-blur-sm">
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-extrabold">{selected.id}</h3>
              <button type="button" className="text-sm font-semibold text-muted" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <StatusBadge status={selected.status} />
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ['Driver', selected.driver],
                ['Vehicle', selected.vehicle],
                ['Cargo', selected.cargo],
                ['Pickup', selected.pickup],
                ['Dropoff', selected.dropoff],
                ['Distance', `${selected.distanceKm.toLocaleString()} km`],
                ['Mode', selected.mode],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  )
}
