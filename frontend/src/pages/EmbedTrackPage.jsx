import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package } from 'lucide-react'
import { portalService } from '../services/portalService'

/**
 * Public embeddable tracking widget for Stage 2 shortcodes.
 * Usage: /embed/track?code=BKG-MKT-00001
 * No login required — looks up booking by code via public-friendly path.
 * Currently uses authenticated-less search through a lightweight public endpoint fallback:
 * we call bookings list is private, so we expose status via query to a dedicated public route when available.
 * For Stage 2 MVP: accept code + optional token-free stub from API origin /pricing is not enough —
 * so this page fetches GET /v1/ecommerce/track/:code if present, else shows code-only shell.
 */

async function fetchTracking(code) {
  const base = portalService.apiBaseUrl || 'http://localhost:3000/v1'
  const res = await fetch(`${base}/ecommerce/track/${encodeURIComponent(code)}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Tracking not found')
  }
  return res.json()
}

export default function EmbedTrackPage() {
  const [params] = useSearchParams()
  const code = (params.get('code') || '').trim()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!code) {
      setError('Add ?code=BOOKING_CODE to the URL')
      return
    }
    setLoading(true)
    setError('')
    fetchTracking(code)
      .then(setData)
      .catch((err) => setError(err.message || 'Unable to load tracking'))
      .finally(() => setLoading(false))
  }, [code])

  return (
    <div className="min-h-screen bg-[#f4f7fb] p-4 text-slate-900">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Package size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">CloudShip tracking</p>
            <p className="font-mono text-sm font-semibold">{code || '—'}</p>
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

        {data ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Status</span>
              <span className="font-semibold capitalize">{String(data.status || '').replaceAll('_', ' ')}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Payment</span>
              <span className="font-semibold capitalize">{String(data.paymentStatus || '—').replaceAll('_', ' ')}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Route</span>
              <span className="text-right font-medium">
                {data.pickup} → {data.dropoff}
              </span>
            </div>
            {data.trackingNumber ? (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Tracking #</span>
                <span className="font-mono font-semibold">{data.trackingNumber}</span>
              </div>
            ) : null}
            {Array.isArray(data.timeline) && data.timeline.length ? (
              <ol className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                {data.timeline.map((step) => (
                  <li key={step.stage} className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${step.done ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    />
                    <span className={step.done ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
