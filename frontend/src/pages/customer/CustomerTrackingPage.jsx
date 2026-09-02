import { Check } from 'lucide-react'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

function Stepper({ timeline }) {
  if (!timeline || timeline.length === 0) return null
  return (
    <div className="mt-4 flex items-center">
      {timeline.map((step, i) => (
        <div key={step.stage} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                step.done
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-white text-muted'
              }`}
            >
              {step.done ? <Check size={14} /> : i + 1}
            </div>
            <p className={`w-20 text-center text-[11px] font-semibold ${step.done ? 'text-ink' : 'text-muted'}`}>
              {step.label}
            </p>
            {step.timestamp ? <p className="text-[10px] text-muted">{step.timestamp.slice(0, 10)}</p> : null}
          </div>
          {i < timeline.length - 1 ? (
            <div className={`mx-1 h-0.5 flex-1 ${step.done ? 'bg-brand' : 'bg-line'}`} />
          ) : null}
        </div>
      ))}
    </div>
  )
}

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
          <Card className="p-6 text-sm text-muted">No active parcels right now.</Card>
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
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="rounded-full bg-surface px-3 py-1 font-semibold">{p.mode}</span>
                <span className="font-semibold text-ink">${p.value.toLocaleString()}</span>
                <span className="text-muted">Booked {p.bookedAt?.slice(0, 10)}</span>
              </div>
              <Stepper timeline={p.timeline} />
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
