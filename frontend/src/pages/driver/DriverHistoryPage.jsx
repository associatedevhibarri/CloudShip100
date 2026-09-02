import { useMemo, useState } from 'react'
import { useDriverData } from '../../hooks/useDriverData'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'

const PERIODS = [
  { id: 7, label: 'Last 7 days' },
  { id: 30, label: 'Last 30 days' },
  { id: 90, label: 'Last 90 days' },
]

function daysAgo(dateStr, days) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return new Date(dateStr) >= cutoff
}

export default function DriverHistoryPage() {
  const { history, loading, error, reload } = useDriverData()
  const [period, setPeriod] = useState(90)

  const filteredTrips = useMemo(
    () => history.completedTrips.filter((t) => daysAgo(t.endAt, period)),
    [history.completedTrips, period],
  )

  const filteredParcels = useMemo(
    () =>
      history.deliveredParcels.filter((p) => {
        const trip = history.completedTrips.find((t) => t.id === p.tripId)
        return trip ? daysAgo(trip.endAt, period) : true
      }),
    [history.deliveredParcels, history.completedTrips, period],
  )

  const columns = [
    { key: 'id', label: 'Trip' },
    {
      key: 'route',
      label: 'Route',
      render: (row) => (
        <span className="block max-w-xs truncate text-xs">
          {row.pickup} → {row.dropoff}
        </span>
      ),
    },
    {
      key: 'parcels',
      label: 'Parcels',
      render: (row) => row.parcelIds?.length || 0,
    },
    {
      key: 'onTime',
      label: 'On time',
      render: (row) => <StatusBadge status={row.onTime ? 'compliant' : 'expiring'} />,
    },
    {
      key: 'endAt',
      label: 'Completed',
      render: (row) => new Date(row.endAt).toLocaleDateString(),
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="History"
        subtitle="Completed trips and delivery performance."
        actions={
          <button type="button" onClick={reload} className="rounded-full border border-line px-4 py-2 text-sm font-bold">
            Refresh
          </button>
        }
      />

      {error ? (
        <Card className="mb-4 border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</Card>
      ) : null}

      <FilterBar className="mb-4">
        {PERIODS.map((p) => (
          <FilterButton key={p.id} active={period === p.id} onClick={() => setPeriod(p.id)}>
            {p.label}
          </FilterButton>
        ))}
      </FilterBar>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Completed trips</p>
          <p className="mt-1 text-2xl font-extrabold">{filteredTrips.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Deliveries</p>
          <p className="mt-1 text-2xl font-extrabold">{filteredParcels.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Damage incidents</p>
          <p className="mt-1 text-2xl font-extrabold">{history.totalIncidents}</p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-extrabold">Completed trips</h3>
        </div>
        {filteredTrips.length ? (
          <DataTable columns={columns} rows={filteredTrips} />
        ) : (
          <p className="px-5 py-8 text-sm text-muted">No completed trips in this period.</p>
        )}
      </Card>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted">Delivered parcels</h3>
        {filteredParcels.length ? (
          filteredParcels.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-brand">{p.id}</p>
                  <p className="text-sm">{p.cargo}</p>
                </div>
                <StatusBadge status="delivered" />
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-4 text-sm text-muted">No delivered parcels in this period.</Card>
        )}
      </div>
    </div>
  )
}
