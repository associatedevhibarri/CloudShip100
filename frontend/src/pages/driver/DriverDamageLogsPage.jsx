import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, X } from 'lucide-react'
import { useDriverData } from '../../hooks/useDriverData'
import { driverService, getDocumentUrl } from '../../services/driverService'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../context/ToastContext'

const severityOptions = ['minor', 'major']

export default function DriverDamageLogsPage() {
  const { damageLogs, parcels, trips, loading, error, reload, token } = useDriverData()
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    parcelId: '',
    tripId: '',
    severity: 'minor',
    description: '',
    location: '',
  })
  const [formError, setFormError] = useState('')
  const [photo, setPhoto] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (parcels.length && !form.parcelId) {
      setForm((prev) => ({ ...prev, parcelId: parcels[0].id }))
    }
    if (trips.length && !form.tripId) {
      setForm((prev) => ({ ...prev, tripId: trips[0].id }))
    }
  }, [parcels, trips, form.parcelId, form.tripId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) return
    if (!form.description.trim() || form.description.trim().length < 5) {
      setFormError('Description must be at least 5 characters.')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      await driverService.createDamageLog(token, form, photo)
      setForm({ ...form, description: '', location: '' })
      setPhoto(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success('Damage report submitted successfully.')
      await reload()
    } catch (err) {
      setFormError(err.message || 'Failed to submit damage report')
    } finally {
      setSubmitting(false)
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
        title="Damage Logs"
        subtitle="Report and review parcel or vehicle damage."
        actions={
          <button type="button" onClick={reload} className="rounded-full border border-line px-4 py-2 text-sm font-bold">
            Refresh
          </button>
        }
      />

      {error ? (
        <Card className="mb-4 border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</Card>
      ) : null}

      <Card className="mb-6 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-extrabold">
          <AlertTriangle size={18} className="text-brand" />
          Report damage
        </h3>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-muted">Parcel</label>
            <select
              value={form.parcelId}
              onChange={(e) => setForm({ ...form, parcelId: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
            >
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.cargo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-muted">Trip</label>
            <select
              value={form.tripId}
              onChange={(e) => setForm({ ...form, tripId: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} — {t.cargo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-muted">Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
            >
              {severityOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-muted">Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Where did this happen?"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase text-muted">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe the damage..."
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
            />
          </div>
          {formError ? (
            <p className="sm:col-span-2 text-xs font-semibold text-rose-600" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="hidden"
              id="damage-photo-input"
            />
            <label
              htmlFor="damage-photo-input"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold hover:bg-surface"
            >
              <Camera size={16} />
              {photo ? photo.name : 'Add photo'}
            </label>
            {photo ? (
              <button
                type="button"
                onClick={() => {
                  setPhoto(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="text-muted hover:text-ink"
                aria-label="Remove photo"
              >
                <X size={16} />
              </button>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-brand-gradient px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {damageLogs.length ? (
          damageLogs.map((log) => (
            <Card key={log.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-brand">{log.id}</p>
                  <p className="mt-1 font-extrabold capitalize">{log.severity} damage</p>
                </div>
                <StatusBadge status={log.status} />
              </div>
              <p className="mt-3 text-sm">{log.description}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-muted">
                {log.parcelId ? <span>Parcel {log.parcelId}</span> : null}
                {log.tripId ? <span>Trip {log.tripId}</span> : null}
                <span>{log.location}</span>
                <span>{new Date(log.reportedAt).toLocaleString()}</span>
              </div>
              {log.photoUrl ? (
                <img
                  src={getDocumentUrl(log.photoUrl)}
                  alt="Damage report"
                  className="mt-3 h-32 w-full max-w-xs rounded-xl border border-line object-cover"
                />
              ) : null}
            </Card>
          ))
        ) : (
          <Card className="p-5 text-sm text-muted">No damage reports yet.</Card>
        )}
      </div>
    </div>
  )
}
