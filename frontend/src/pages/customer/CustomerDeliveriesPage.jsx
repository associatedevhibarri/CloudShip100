import { Link } from 'react-router-dom'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { portalService } from '../../services/portalService'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

export default function CustomerDeliveriesPage() {
  const { data: bookings, loading, error } = usePortalFetch(portalService.getMyBookings)
  const deliveries = bookings || []

  if (loading) return <LoadingState label="Loading your deliveries..." />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <PageHeader
        title="My Deliveries"
        subtitle="Shipments booked after a live quote. Warehouse confirms arrival at the dock."
        actions={
          <Link
            to="/customer/new-booking"
            className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white"
          >
            New booking
          </Link>
        }
      />

      <div className="space-y-3">
        {deliveries.length === 0 ? (
          <Card className="p-6 text-sm text-muted">
            No shipments yet.{' '}
            <Link to="/customer/new-booking" className="font-semibold text-brand">
              Compare courier prices and book
            </Link>
            .
          </Card>
        ) : (
          deliveries.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-brand">{d.code || d.id}</p>
                  <h3 className="mt-1 text-lg font-extrabold">{d.cargo}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {d.pickup} → {d.dropoff}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={d.status} />
                  {d.paymentStatus && d.paymentStatus !== 'not_required' ? (
                    <StatusBadge status={d.paymentStatus} />
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="rounded-full bg-surface px-3 py-1 font-semibold">{d.mode}</span>
                {d.source && d.source !== 'portal' ? (
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold capitalize text-sky-800">
                    {d.source}
                    {d.externalOrderId ? ` · #${d.externalOrderId}` : ''}
                  </span>
                ) : null}
                <span className="font-semibold text-ink">${Number(d.value || 0).toLocaleString()}</span>
                <span className="text-muted">Booked {d.bookedAt?.slice(0, 10)}</span>
              </div>
              {d.timeline?.length ? (
                <ol className="mt-4 flex flex-wrap gap-2">
                  {d.timeline.map((step) => (
                    <li
                      key={step.stage}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        step.done ? 'bg-brand text-white' : 'bg-surface text-muted'
                      }`}
                    >
                      {step.label}
                    </li>
                  ))}
                </ol>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
