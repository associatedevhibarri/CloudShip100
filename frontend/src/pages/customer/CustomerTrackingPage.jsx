import { Link } from 'react-router-dom'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'
import { TransitTimeline } from '../../components/ui/TransitTimeline'
import { displayShipmentStatus, displayShipmentLabel } from '../../utils/shipmentProgress'

export default function CustomerTrackingPage() {
  const { data: bookings, loading, error } = usePortalFetch(portalService.getMyBookings)

  if (loading) return <LoadingState label="Loading your parcels..." />
  if (error) return <ErrorState message={error} />

  const parcels = (bookings || []).filter((o) => o.status !== 'completed' && o.status !== 'history')

  return (
    <div>
      <PageHeader title="Parcel Status Updates" subtitle="Live tracking for your active shipments." />
      <div className="space-y-4">
        {parcels.length === 0 ? (
          <Card className="p-6 text-sm text-muted">
            No active parcels right now.{' '}
            <Link to="/customer/new-booking" className="font-semibold text-brand hover:underline">
              Book your first shipment →
            </Link>
          </Card>
        ) : (
          parcels.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-brand">{p.code || p.id}</p>
                  <h3 className="mt-1 text-lg font-extrabold">{p.cargo}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {p.pickup} → {p.dropoff}
                  </p>
                </div>
                <StatusBadge status={displayShipmentLabel(p)} />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="rounded-full bg-surface px-3 py-1 font-semibold">{p.mode}</span>
                <span className="font-semibold text-ink">${p.value.toLocaleString()}</span>
                <span className="text-muted">Booked {p.bookedAt?.slice(0, 10)}</span>
              </div>
              <div className="mt-4">
                <TransitTimeline timeline={p.timeline} status={displayShipmentStatus(p)} />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
