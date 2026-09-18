import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../components/ui/FilterBar'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'
import { useToast } from '../context/ToastContext'

function TripQueue({ title, items, tone }) {
  return (
    <Card className={`p-4 ${tone}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-extrabold text-ink">{title}</h3>
        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold text-brand">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted">None right now.</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((trip) => (
            <li key={trip.tripId || trip.id} className="rounded-xl border border-line/80 bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{trip.id}</p>
                <StatusBadge status={trip.status} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {trip.driver} · {trip.vehicle || 'No vehicle'}
              </p>
              <p className="mt-1 truncate text-xs text-ink">
                {trip.pickup} → {trip.dropoff}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const EMPTY_FORM = {
  employeeId: '',
  cargo: '',
  pickup: '',
  dropoff: '',
  vehicle: '',
  mode: 'road',
}

export default function TripsPage() {
  const toast = useToast()
  const [trips, setTrips] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('all')
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [reassignId, setReassignId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [tripRows, driverRows] = await Promise.all([api.getTrips(), api.getDrivers()])
      setTrips(Array.isArray(tripRows) ? tripRows : [])
      setDrivers(Array.isArray(driverRows) ? driverRows : [])
    } catch (err) {
      setError(err.message || 'Failed to load trips')
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const approvedDrivers = drivers.filter((d) => d.approvalStatus === 'active' && d.employeeId)

  const filtered = useMemo(
    () => (mode === 'all' ? trips : trips.filter((t) => t.mode === mode)),
    [trips, mode]
  )

  const starting = filtered.filter((t) => t.status === 'starting_soon')
  const ending = filtered.filter((t) => t.status === 'ending_soon')
  const progress = filtered.filter((t) => t.status === 'in_progress')

  const refreshSelected = (nextTrips, current) => {
    if (!current) return
    const updated = nextTrips.find((t) => t.tripId === current.tripId)
    setSelected(updated || null)
  }

  const createTrip = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await api.createTrip(form)
      toast.success('Trip created.')
      setCreating(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      toast.error(err.message || 'Failed to create trip')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (status) => {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await api.updateTrip(selected.tripId, { status })
      toast.success(`Trip marked ${status.replaceAll('_', ' ')}.`)
      const rows = await api.getTrips()
      setTrips(Array.isArray(rows) ? rows : [])
      setSelected(updated)
    } catch (err) {
      toast.error(err.message || 'Failed to update trip')
    } finally {
      setSaving(false)
    }
  }

  const reassign = async () => {
    if (!selected || !reassignId) return
    setSaving(true)
    try {
      const updated = await api.reassignTrip(selected.tripId, reassignId)
      toast.success('Trip reassigned.')
      const rows = await api.getTrips()
      setTrips(Array.isArray(rows) ? rows : [])
      setSelected(updated)
      setReassignId('')
    } catch (err) {
      toast.error(err.message || 'Failed to reassign trip')
    } finally {
      setSaving(false)
    }
  }

  const cancel = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await api.cancelTrip(selected.tripId)
      toast.success('Trip cancelled.')
      const rows = await api.getTrips()
      setTrips(Array.isArray(rows) ? rows : [])
      refreshSelected(Array.isArray(rows) ? rows : [], updated)
      setSelected(updated)
    } catch (err) {
      toast.error(err.message || 'Failed to cancel trip')
    } finally {
      setSaving(false)
    }
  }

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
        <button type="button" className="text-sm font-semibold text-brand" onClick={() => setSelected(row)}>
          Details
        </button>
      ),
    },
  ]

  if (loading) return <LoadingState label="Loading trips..." />

  const canMutate = selected && selected.status !== 'cancelled' && selected.status !== 'completed'

  return (
    <div>
      <PageHeader
        title="Trips"
        subtitle="Create, reassign, cancel, or correct driver trips."
        actions={
          <button
            type="button"
            className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white"
            onClick={() => setCreating(true)}
          >
            New trip
          </button>
        }
      />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

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
        {['all', 'road', 'air', 'maritime', 'rail'].map((m) => (
          <FilterButton key={m} active={mode === m} onClick={() => setMode(m)}>
            {m === 'all' ? 'All modes' : m}
          </FilterButton>
        ))}
      </FilterBar>

      {filtered.length === 0 && !error ? (
        <Card className="mt-4 p-8 text-center text-sm text-muted">
          No trips yet. Create one here or assign a warehouse parcel to an approved driver.
        </Card>
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey="tripId" />
      )}

      {creating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-extrabold">New trip</h3>
              <button type="button" className="text-sm font-semibold text-muted" onClick={() => setCreating(false)}>
                Close
              </button>
            </div>
            <form className="space-y-3" onSubmit={createTrip}>
              <label className="block text-xs font-semibold text-muted">
                Driver
                <select
                  required
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink"
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">Select an approved driver</option>
                  {approvedDrivers.map((driver) => (
                    <option key={driver.employeeId} value={driver.employeeId}>
                      {driver.name} ({driver.employeeId})
                    </option>
                  ))}
                </select>
              </label>
              {['cargo', 'pickup', 'dropoff', 'vehicle'].map((field) => (
                <label key={field} className="block text-xs font-semibold capitalize text-muted">
                  {field}
                  <input
                    required={field !== 'vehicle'}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink"
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="block text-xs font-semibold text-muted">
                Mode
                <select
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink"
                  value={form.mode}
                  onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                >
                  {['road', 'air', 'maritime', 'rail'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Create trip
              </button>
            </form>
          </Card>
        </div>
      ) : null}

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
                ['Employee ID', selected.employeeId || '—'],
                ['Vehicle', selected.vehicle || '—'],
                ['Cargo', selected.cargo],
                ['Pickup', selected.pickup],
                ['Dropoff', selected.dropoff],
                ['Distance', `${Number(selected.distanceKm || 0).toLocaleString()} km`],
                ['Mode', selected.mode],
                ['Order', selected.clientOrderId || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            {canMutate ? (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted">Correct status</p>
                  <div className="flex flex-wrap gap-2">
                    {['starting_soon', 'in_progress', 'ending_soon', 'completed'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={saving || selected.status === status}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                        onClick={() => updateStatus(status)}
                      >
                        {status.replaceAll('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted">Reassign</p>
                  <select
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold"
                    value={reassignId}
                    onChange={(e) => setReassignId(e.target.value)}
                  >
                    <option value="">Approved driver</option>
                    {approvedDrivers.map((driver) => (
                      <option key={driver.employeeId} value={driver.employeeId}>
                        {driver.name} ({driver.employeeId})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={saving || !reassignId}
                    className="mt-2 rounded-full border border-brand px-3 py-1.5 text-xs font-bold text-brand disabled:opacity-50"
                    onClick={reassign}
                  >
                    Reassign driver
                  </button>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
                  onClick={cancel}
                >
                  Cancel trip
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
