import { useMemo, useState } from 'react'
import { Phone, User } from 'lucide-react'
import { useDriverData } from '../../hooks/useDriverData'
import { driverService } from '../../services/driverService'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'picked_up', label: 'Picked up' },
  { id: 'in_transit', label: 'In transit' },
  { id: 'delivered', label: 'Delivered' },
]

export default function DriverParcelsPage() {
  const { parcels, loading, error, reload, token } = useDriverData()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [notice, setNotice] = useState('')

  const filtered = useMemo(() => {
    return filter === 'all' ? parcels : parcels.filter((p) => p.status === filter)
  }, [parcels, filter])

  const updateStatus = async (id, status) => {
    if (!token) return
    setUpdating(true)
    try {
      await driverService.updateParcelStatus(token, id, status)
      setSelected(null)
      setNotice(`Parcel ${id} marked as ${status.replaceAll('_', ' ')}.`)
      await reload()
      setTimeout(() => setNotice(''), 3000)
    } catch (err) {
      setNotice(err.message || 'Failed to update parcel')
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

      {notice ? (
        <Card className="mb-4 border-brand/20 bg-brand-light/30 p-3 text-sm font-semibold text-brand-dark">{notice}</Card>
      ) : null}

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
          filtered.map((parcel) => (
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
                </div>
                <StatusBadge status={parcel.status} />
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
          ))
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

            <div className="mt-6 flex flex-wrap gap-2">
              {selected.status === 'assigned' ? (
                <button
                  type="button"
                  disabled={updating}
                  className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => updateStatus(selected.id, 'picked_up')}
                >
                  Mark picked up
                </button>
              ) : null}
              {selected.status === 'picked_up' ? (
                <button
                  type="button"
                  disabled={updating}
                  className="rounded-full border border-brand px-4 py-2 text-sm font-bold text-brand disabled:opacity-50"
                  onClick={() => updateStatus(selected.id, 'in_transit')}
                >
                  Mark in transit
                </button>
              ) : null}
              {['picked_up', 'in_transit', 'assigned'].includes(selected.status) ? (
                <button
                  type="button"
                  disabled={updating}
                  className="rounded-full border border-brand px-4 py-2 text-sm font-bold text-brand disabled:opacity-50"
                  onClick={() => updateStatus(selected.id, 'delivered')}
                >
                  Mark delivered
                </button>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
