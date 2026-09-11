import { useMemo, useState } from 'react'
import { Phone, User } from 'lucide-react'
import { useDriverData } from '../../hooks/useDriverData'
import { driverService } from '../../services/driverService'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { useToast } from '../../context/ToastContext'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'picked_up', label: 'Picked up' },
  { id: 'in_transit', label: 'In transit' },
  { id: 'delivered', label: 'Delivered' },
]

const NEXT_ACTION = {
  assigned: { status: 'picked_up', label: 'Mark picked up', className: 'rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white disabled:opacity-50' },
  picked_up: { status: 'in_transit', label: 'Mark in transit', className: 'rounded-full border border-brand px-4 py-2 text-sm font-bold text-brand disabled:opacity-50' },
  in_transit: { status: 'delivered', label: 'Mark delivered', className: 'rounded-full border border-brand px-4 py-2 text-sm font-bold text-brand disabled:opacity-50' },
}

const marketplaceLine = (parcel) => {
  if (!parcel?.source || parcel.source === 'portal') return null
  const parts = [parcel.source]
  if (parcel.externalOrderId) parts.push(`#${parcel.externalOrderId}`)
  if (parcel.paymentStatus) parts.push(String(parcel.paymentStatus).replaceAll('_', ' '))
  return parts.join(' · ')
}

export default function DriverParcelsPage() {
  const { parcels, loading, error, reload, token } = useDriverData()
  const toast = useToast()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)

  const filtered = useMemo(() => {
    return filter === 'all' ? parcels : parcels.filter((p) => p.status === filter)
  }, [parcels, filter])

  const updateStatus = async (id, status) => {
    if (!token) return
    setUpdating(true)
    try {
      await driverService.updateParcelStatus(token, id, status)
      setSelected(null)
      toast.success(`Parcel ${id} marked as ${status.replaceAll('_', ' ')}.`)
      await reload()
    } catch (err) {
      toast.error(err.message || 'Failed to update parcel')
    } finally {
      setUpdating(false)
    }
  }

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
        title="My Parcels"
        subtitle="Assigned parcels with recipient contact details."
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
        {FILTERS.map((f) => (
          <FilterButton key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </FilterButton>
        ))}
      </FilterBar>

      <div className="space-y-3">
        {filtered.length ? (
          filtered.map((parcel) => {
            const shopLine = marketplaceLine(parcel)
            return (
              <Card
                key={parcel.id}
                className="cursor-pointer p-5 transition hover:border-brand/30"
                onClick={() => setSelected(parcel)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-brand">{parcel.id}</p>
                    <h3 className="mt-1 text-lg font-extrabold">{parcel.cargo}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {parcel.pickup} → {parcel.dropoff}
                    </p>
                    {shopLine ? <p className="mt-1 text-xs font-semibold capitalize text-muted">{shopLine}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {parcel.paymentStatus && parcel.paymentStatus !== 'not_required' ? (
                      <StatusBadge status={parcel.paymentStatus} />
                    ) : null}
                    <StatusBadge status={parcel.status} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <User size={14} className="text-brand" />
                    {parcel.recipientName}
                  </span>
                  <a
                    href={`tel:${parcel.recipientPhone}`}
                    className="flex items-center gap-1.5 font-semibold text-brand"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone size={14} />
                    {parcel.recipientPhone}
                  </a>
                </div>
              </Card>
            )
          })
        ) : (
          <Card className="p-5 text-sm text-muted">
            {filter === 'all' && !parcels.length ? (
              <div className="space-y-2">
                <p className="font-semibold text-ink">No parcels assigned yet.</p>
                <p>
                  Warehouse assigns parcels to your employee ID after receiving and labelling. Tap Refresh after
                  assignment.
                </p>
              </div>
            ) : (
              'No parcels in this filter.'
            )}
          </Card>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-brand">{selected.id}</p>
                <h3 className="text-xl font-extrabold">{selected.cargo}</h3>
                {marketplaceLine(selected) ? (
                  <p className="mt-1 text-sm font-semibold capitalize text-muted">{marketplaceLine(selected)}</p>
                ) : null}
              </div>
              <button type="button" className="text-sm font-semibold text-muted" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Client</dt>
                <dd className="font-semibold">{selected.clientName}</dd>
              </div>
              {selected.clientOrderId ? (
                <div>
                  <dt className="text-xs text-muted">Client order</dt>
                  <dd className="font-semibold">{selected.clientOrderId}</dd>
                </div>
              ) : null}
              {selected.externalOrderId ? (
                <div>
                  <dt className="text-xs text-muted">Shop order</dt>
                  <dd className="font-semibold">#{selected.externalOrderId}</dd>
                </div>
              ) : null}
              {selected.source ? (
                <div>
                  <dt className="text-xs text-muted">Source</dt>
                  <dd className="font-semibold capitalize">{selected.source}</dd>
                </div>
              ) : null}
              {selected.paymentStatus ? (
                <div>
                  <dt className="text-xs text-muted">Payment</dt>
                  <dd>
                    <StatusBadge status={selected.paymentStatus} />
                  </dd>
                </div>
              ) : null}
              {selected.trackingNumber ? (
                <div>
                  <dt className="text-xs text-muted">Tracking</dt>
                  <dd className="font-semibold">{selected.trackingNumber}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-muted">Weight</dt>
                <dd className="font-semibold">{selected.weight}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Barcode</dt>
                <dd className="font-semibold">{selected.barcode}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Recipient</dt>
                <dd className="font-semibold">
                  {selected.recipientName} · {selected.recipientPhone}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Instructions</dt>
                <dd className="font-semibold">{selected.instructions}</dd>
              </div>
            </dl>

            {selected.actionsBlocked ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                {selected.actionsBlockedReason || 'Updates blocked for this parcel.'}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {!selected.actionsBlocked && NEXT_ACTION[selected.status] ? (
                <button
                  type="button"
                  disabled={updating}
                  className={NEXT_ACTION[selected.status].className}
                  onClick={() => updateStatus(selected.id, NEXT_ACTION[selected.status].status)}
                >
                  {NEXT_ACTION[selected.status].label}
                </button>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
