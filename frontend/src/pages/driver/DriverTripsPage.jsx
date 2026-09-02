import { useMemo, useState } from 'react'
import { Phone, Package, Route, Navigation } from 'lucide-react'
import { useDriverData } from '../../hooks/useDriverData'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'

function TripCard({ trip, onSelect }) {
  const parcelCount = trip.parcelIds?.length || 0

  return (
    <Card className="cursor-pointer p-5 transition hover:border-brand/30" onClick={() => onSelect(trip)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-brand">{trip.id}</p>
          <h3 className="mt-1 text-lg font-extrabold">{trip.cargo}</h3>
        </div>
        <StatusBadge status={trip.status} />
      </div>
      <p className="mt-3 text-sm text-muted">
        {trip.pickup} → {trip.dropoff}
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-surface px-3 py-1 font-semibold">{trip.vehicle}</span>
        <span className="font-semibold text-ink">{trip.distanceKm?.toLocaleString()} km</span>
        {parcelCount > 0 ? (
          <span className="font-semibold text-brand">{parcelCount} parcels</span>
        ) : null}
      </div>
    </Card>
  )
}

export default function DriverTripsPage() {
  const { activeTrips, upcomingTrips, profile, parcels, loading, error, reload } = useDriverData()
  const [selected, setSelected] = useState(null)

  const bundledHint = useMemo(() => {
    const active = activeTrips[0]
    if (!active?.parcelIds?.length) return null
    const bundled = active.parcelIds.filter((id) => id.startsWith('PRATIK') || id.startsWith('DEEPAK'))
    if (bundled.length >= 2) return `${bundled.length} parcels bundled — ${bundled.join(' + ')} same zone`
    return null
  }, [activeTrips])

  const selectedParcels = selected
    ? parcels.filter((p) => selected.parcelIds?.includes(p.id))
    : []

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
        title="My Trips"
        subtitle={`Today's assignments for ${profile?.name || 'driver'}.`}
        actions={
          <button type="button" onClick={reload} className="rounded-full border border-line px-4 py-2 text-sm font-bold">
            Refresh
          </button>
        }
      />

      {error ? (
        <Card className="mb-4 border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</Card>
      ) : null}

      {bundledHint ? (
        <Card className="mb-4 border-brand/20 bg-brand-light/30 p-4">
          <p className="text-sm font-semibold text-brand-dark">Route optimization: {bundledHint}</p>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Active</p>
          <p className="mt-1 text-2xl font-extrabold">{activeTrips.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Upcoming</p>
          <p className="mt-1 text-2xl font-extrabold">{upcomingTrips.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Vehicle</p>
          <p className="mt-1 text-lg font-extrabold">{profile?.assignedVehicle || '—'}</p>
        </Card>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-muted">Active trips</h2>
        <div className="space-y-3">
          {activeTrips.length ? (
            activeTrips.map((trip) => <TripCard key={trip.id} trip={trip} onSelect={setSelected} />)
          ) : (
            <Card className="p-5 text-sm text-muted">No active trips right now.</Card>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-muted">Upcoming</h2>
        <div className="space-y-3">
          {upcomingTrips.length ? (
            upcomingTrips.map((trip) => <TripCard key={trip.id} trip={trip} onSelect={setSelected} />)
          ) : (
            <Card className="p-5 text-sm text-muted">No upcoming trips scheduled.</Card>
          )}
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-brand">{selected.id}</p>
                <h3 className="text-xl font-extrabold">{selected.cargo}</h3>
              </div>
              <button type="button" className="text-sm font-semibold text-muted" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Route size={16} className="mt-0.5 shrink-0 text-brand" />
                <div>
                  <p className="font-semibold">Route</p>
                  <p className="text-muted">
                    {selected.pickup} → {selected.dropoff}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Navigation size={16} className="mt-0.5 shrink-0 text-brand" />
                <div>
                  <p className="font-semibold">Navigation</p>
                  <p className="text-muted">Start navigation (demo placeholder)</p>
                </div>
              </div>
              {selectedParcels.length ? (
                <div>
                  <p className="mb-2 flex items-center gap-2 font-semibold">
                    <Package size={16} className="text-brand" />
                    Parcels on this trip
                  </p>
                  <ul className="space-y-2">
                    {selectedParcels.map((p) => (
                      <li key={p.id} className="rounded-xl border border-line bg-surface px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">{p.id}</span>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted">{p.recipientName}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold">
                          <Phone size={12} />
                          {p.recipientPhone}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="mt-6 w-full rounded-full bg-brand-gradient py-3 text-sm font-bold text-white"
              onClick={() => setSelected(null)}
            >
              Got it
            </button>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
