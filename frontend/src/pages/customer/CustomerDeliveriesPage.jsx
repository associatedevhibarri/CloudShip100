import { useState } from 'react'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { useAuth } from '../../context/AuthContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'
import { FormField, formInputClass } from '../../components/ui/FormField'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'
import { useToast } from '../../context/ToastContext'

const emptyForm = {
  cargo: '',
  mode: 'Road',
  pickup: '',
  dropoff: '',
  value: '1000',
}

export default function CustomerDeliveriesPage() {
  const { tokens } = useAuth()
  const token = tokens?.access?.token
  const { data: bookings, loading, error, refetch } = usePortalFetch(portalService.getMyBookings)
  const toast = useToast()
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)

  const deliveries = bookings || []

  const onChange = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const bookShipment = async (e) => {
    e.preventDefault()
    if (!token) return
    setBusy(true)
    try {
      const created = await portalService.createBooking(token, {
        cargo: form.cargo,
        mode: form.mode,
        pickup: form.pickup,
        dropoff: form.dropoff,
        value: Number(form.value) || 0,
      })
      setForm(emptyForm)
      await refetch()
      toast.success(`${created.code || created.id} booked. Warehouse will see it as awaiting receive.`)
    } catch (err) {
      toast.error(err.message || 'Could not book shipment')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading your deliveries..." />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <PageHeader
        title="My Deliveries"
        subtitle="Book a shipment, then warehouse confirms when it arrives at the dock."
      />

      <Card className="mb-6 p-5">
        <h3 className="text-lg font-extrabold text-ink">Book a shipment</h3>
        <p className="mt-1 text-sm text-muted">Warehouse operators see this as expected inbound until they mark it received.</p>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={bookShipment}>
          <FormField id="cargo" label="Cargo" required>
            <input
              id="cargo"
              required
              value={form.cargo}
              onChange={onChange('cargo')}
              className={formInputClass()}
              placeholder="Rice — 100kg"
            />
          </FormField>
          <FormField id="mode" label="Mode" required>
            <select id="mode" value={form.mode} onChange={onChange('mode')} className={formInputClass()}>
              {['Road', 'Air', 'Maritime', 'Rail'].map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="pickup" label="Pickup" required>
            <input
              id="pickup"
              required
              value={form.pickup}
              onChange={onChange('pickup')}
              className={formInputClass()}
              placeholder="Durban"
            />
          </FormField>
          <FormField id="dropoff" label="Dropoff" required>
            <input
              id="dropoff"
              required
              value={form.dropoff}
              onChange={onChange('dropoff')}
              className={formInputClass()}
              placeholder="Johannesburg"
            />
          </FormField>
          <FormField id="value" label="Value (USD)" required>
            <input
              id="value"
              required
              type="number"
              min="0"
              step="1"
              value={form.value}
              onChange={onChange('value')}
              className={formInputClass()}
            />
          </FormField>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-brand-gradient py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? 'Booking…' : 'Book shipment'}
            </button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {deliveries.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No shipments yet. Book one above to send it to the warehouse dock.</Card>
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
                <StatusBadge status={d.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="rounded-full bg-surface px-3 py-1 font-semibold">{d.mode}</span>
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
