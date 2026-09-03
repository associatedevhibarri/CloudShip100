import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'
import { GeofenceMap } from '../components/map/GeofenceMap'

const emptyForm = {
  name: '',
  scope: 'radius',
  region: '',
  radiusKm: '1',
  rule: '',
  exclusions: '',
  lat: '',
  lng: '',
  active: true,
}

export default function GeomappingPage() {
  const [geofences, setGeofences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [checkLat, setCheckLat] = useState('-29.8587')
  const [checkLng, setCheckLng] = useState('31.0218')
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await api.getGeofences()
      setGeofences(rows)
    } catch (err) {
      setError(err.message || 'Failed to load geofences')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onChange = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const exclusions = form.exclusions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const body = {
        name: form.name.trim(),
        scope: form.scope,
        region: form.region.trim(),
        rule: form.rule.trim(),
        exclusions,
        active: form.active,
        radiusKm: form.scope === 'radius' && form.radiusKm !== '' ? Number(form.radiusKm) : null,
        lat: form.lat !== '' ? Number(form.lat) : null,
        lng: form.lng !== '' ? Number(form.lng) : null,
      }
      await api.createGeofence(body)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err.message || 'Could not save geofence')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setError('')
    try {
      await api.deleteGeofence(id)
      await load()
    } catch (err) {
      setError(err.message || 'Could not delete geofence')
    }
  }

  const handleEvaluate = async (e) => {
    e.preventDefault()
    setChecking(true)
    setError('')
    try {
      const result = await api.evaluateGeofence({
        lat: Number(checkLat),
        lng: Number(checkLng),
      })
      setCheckResult(result)
    } catch (err) {
      setError(err.message || 'Could not evaluate location')
      setCheckResult(null)
    } finally {
      setChecking(false)
    }
  }

  if (loading) return <LoadingState label="Loading geomapping rules..." />

  return (
    <div>
      <PageHeader
        title="Geomapping"
        subtitle="Coverage by country, province/state, radius, and exclusions. Evaluate any point against live restriction rules."
        actions={
          <Link to="/app/warehouse/zones" className="text-sm font-bold text-brand hover:underline">
            Yard geofences & zones →
          </Link>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {['country', 'province', 'radius'].map((scope) => (
          <Card key={scope} className="p-4">
            <p className="text-xs uppercase capitalize text-muted">{scope} rules</p>
            <p className="text-2xl font-extrabold">
              {geofences.filter((g) => g.scope === scope).length}
            </p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Exceptions</p>
          <p className="text-2xl font-extrabold">
            {geofences.reduce((s, g) => s + (g.exclusions?.length || 0), 0)}
          </p>
        </Card>
      </div>

      <div className="mb-6">
        <GeofenceMap
          geofences={geofences}
          draft={form}
          onMapClick={(lat, lng) => {
            setForm((prev) => ({
              ...prev,
              lat: String(Math.round(lat * 1e6) / 1e6),
              lng: String(Math.round(lng * 1e6) / 1e6),
            }))
            setCheckLat(String(Math.round(lat * 1e6) / 1e6))
            setCheckLng(String(Math.round(lng * 1e6) / 1e6))
          }}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-extrabold text-ink">Add restriction rule</h3>
          <p className="mt-1 text-xs text-muted">
            Click the map to set lat/lng. Radius rules need kilometres. Exclusions are comma-separated.
          </p>
          <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-semibold text-ink">Name</span>
              <input
                required
                value={form.name}
                onChange={onChange('name')}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Scope</span>
              <select
                value={form.scope}
                onChange={onChange('scope')}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="country">country</option>
                <option value="province">province</option>
                <option value="radius">radius</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Region</span>
              <input
                required
                value={form.region}
                onChange={onChange('region')}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Radius (km)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.radiusKm}
                onChange={onChange('radiusKm')}
                disabled={form.scope !== 'radius'}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Policy</span>
              <input
                required
                value={form.rule}
                onChange={onChange('rule')}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Latitude</span>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={onChange('lat')}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Longitude</span>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={onChange('lng')}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-semibold text-ink">Exclusions / exceptions</span>
              <input
                value={form.exclusions}
                onChange={onChange('exclusions')}
                placeholder="e.g. Restricted mining zones, Night transit"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.active} onChange={onChange('active')} />
              <span className="font-semibold text-ink">Active</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2"
            >
              {saving ? 'Saving...' : 'Save rule'}
            </button>
          </form>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-extrabold text-ink">Check location</h3>
          <p className="mt-1 text-xs text-muted">
            Tests whether a GPS point falls inside radius rules and surfaces matching exclusions.
          </p>
          <form onSubmit={handleEvaluate} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Latitude</span>
              <input
                required
                type="number"
                step="any"
                value={checkLat}
                onChange={(e) => setCheckLat(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Longitude</span>
              <input
                required
                type="number"
                step="any"
                value={checkLng}
                onChange={(e) => setCheckLng(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <button
              type="submit"
              disabled={checking}
              className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-bold text-ink sm:col-span-2"
            >
              {checking ? 'Checking...' : 'Evaluate restrictions'}
            </button>
          </form>
          {checkResult ? (
            <div className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm">
              <p className="font-extrabold text-ink">
                {checkResult.allowed ? 'No blocking exceptions' : 'Exceptions apply'}
              </p>
              <p className="mt-1 text-muted">
                Matched {checkResult.matchedRules?.length || 0} rule(s)
                {checkResult.exclusions?.length
                  ? ` · ${checkResult.exclusions.join(', ')}`
                  : ' · no exclusions'}
              </p>
              {checkResult.matchedRules?.length ? (
                <ul className="mt-3 space-y-1 text-xs text-muted">
                  {checkResult.matchedRules.map((r) => (
                    <li key={r.id}>
                      {r.name} · {r.distanceKm} km · {r.rule}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>

      <DataTable
        columns={[
          { key: 'name', label: 'Rule' },
          { key: 'scope', label: 'Scope' },
          { key: 'region', label: 'Region' },
          {
            key: 'radiusKm',
            label: 'Radius',
            render: (r) => (r.radiusKm ? `${r.radiusKm} km` : '—'),
          },
          { key: 'rule', label: 'Policy' },
          {
            key: 'exclusions',
            label: 'Exclusions',
            render: (r) => (r.exclusions?.length ? r.exclusions.join(', ') : 'None'),
          },
          {
            key: 'active',
            label: 'Active',
            render: (r) => (r.active === false ? 'No' : 'Yes'),
          },
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                Delete
              </button>
            ),
          },
        ]}
        rows={geofences}
      />
    </div>
  )
}
