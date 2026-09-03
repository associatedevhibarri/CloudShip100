import { useEffect, useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

const MODES = ['Road', 'Air', 'Maritime', 'Rail']

const emptyRates = () =>
  MODES.map((mode) => ({
    mode,
    baseFee: '',
    perKm: '',
    perKg: '',
    active: true,
  }))

export default function PricingRatesPage() {
  const [rates, setRates] = useState(emptyRates())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await api.getPricingRates()
      const byMode = Object.fromEntries((rows || []).map((r) => [r.mode, r]))
      setRates(
        MODES.map((mode) => {
          const row = byMode[mode]
          return {
            mode,
            baseFee: row?.baseFee ?? '',
            perKm: row?.perKm ?? '',
            perKg: row?.perKg ?? '',
            active: row?.active !== false,
          }
        }),
      )
    } catch (err) {
      setError(err.message || 'Failed to load rates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const samplePreview = useMemo(() => {
    return rates.map((r) => {
      const baseFee = Number(r.baseFee) || 0
      const perKm = Number(r.perKm) || 0
      const perKg = Number(r.perKg) || 0
      const sample = baseFee + perKm * 100 + perKg * 50
      return { mode: r.mode, sample: Math.round(sample * 100) / 100 }
    })
  }, [rates])

  const onChange = (mode, key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setRates((prev) => prev.map((row) => (row.mode === mode ? { ...row, [key]: value } : row)))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSavedMsg('')
    try {
      const payload = {
        rates: rates.map((r) => ({
          mode: r.mode,
          baseFee: Number(r.baseFee),
          perKm: Number(r.perKm),
          perKg: Number(r.perKg),
          active: r.active !== false,
        })),
      }
      const updated = await api.savePricingRates(payload)
      const byMode = Object.fromEntries((updated || []).map((r) => [r.mode, r]))
      setRates(
        MODES.map((mode) => {
          const row = byMode[mode] || rates.find((x) => x.mode === mode)
          return {
            mode,
            baseFee: row?.baseFee ?? '',
            perKm: row?.perKm ?? '',
            perKg: row?.perKg ?? '',
            active: row?.active !== false,
          }
        }),
      )
      setSavedMsg('Rate card saved. Home live pricing will use these values.')
    } catch (err) {
      setError(err.message || 'Could not save rates')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="Loading rate card..." />

  return (
    <div>
      <PageHeader
        title="Live Pricing Rates"
        subtitle="Operator-owned rate card. Home quotes use baseFee + perKm × distance + perKg × weight with Google Maps distance."
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      {savedMsg ? (
        <div className="mb-4 rounded-[var(--radius-card)] border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {savedMsg}
        </div>
      ) : null}

      <form onSubmit={handleSave}>
        <div className="grid gap-4 md:grid-cols-2">
          {rates.map((row) => (
            <Card key={row.mode} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-ink">{row.mode}</h3>
                <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                  <input type="checkbox" checked={row.active} onChange={onChange(row.mode, 'active')} />
                  Active
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-ink">Base fee ($)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.baseFee}
                    onChange={onChange(row.mode, 'baseFee')}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-ink">Per km ($)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.perKm}
                    onChange={onChange(row.mode, 'perKm')}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-semibold text-ink">Per kg ($)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.perKg}
                    onChange={onChange(row.mode, 'perKg')}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-muted">
                Sample (100 km · 50 kg):{' '}
                <span className="font-bold text-ink">
                  ${samplePreview.find((s) => s.mode === row.mode)?.sample.toLocaleString()}
                </span>
              </p>
            </Card>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-md disabled:opacity-60"
        >
          <Calculator size={16} />
          {saving ? 'Saving...' : 'Save rate card'}
        </button>
      </form>
    </div>
  )
}
