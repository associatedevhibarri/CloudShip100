import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { portalService } from '../../services/portalService'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

const MODES = ['Road', 'Air', 'Maritime', 'Rail']

export default function CustomerNewBookingPage() {
  const { tokens } = useAuth()
  const navigate = useNavigate()

  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [cargo, setCargo] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [mode, setMode] = useState('Road')

  const [quote, setQuote] = useState(null)
  const [quoting, setQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const canQuote = pickup.trim() && dropoff.trim() && Number(weightKg) > 0

  useEffect(() => {
    if (!canQuote) {
      setQuote(null)
      setQuoteError('')
      return undefined
    }

    const timer = setTimeout(async () => {
      setQuoting(true)
      setQuoteError('')
      try {
        const result = await portalService.getQuote({
          pickup: pickup.trim(),
          dropoff: dropoff.trim(),
          weightKg: Number(weightKg),
          mode,
        })
        setQuote(result)
      } catch (err) {
        setQuote(null)
        setQuoteError(err.message || 'Could not calculate a price')
      } finally {
        setQuoting(false)
      }
    }, 600)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff, weightKg, mode])

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!quote) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const booking = await portalService.createBooking(tokens?.access?.token, {
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        cargo: cargo.trim(),
        weightKg: Number(weightKg),
        mode,
      })
      navigate('/customer/tracking', { state: { newBookingCode: booking.code } })
    } catch (err) {
      setSubmitError(err.message || 'Could not create the booking')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="New Booking" subtitle="Get a live price and book a new shipment." />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Pickup address</span>
                <input
                  type="text"
                  required
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="e.g. Durban, South Africa"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Dropoff address</span>
                <input
                  type="text"
                  required
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="e.g. Johannesburg, South Africa"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-ink">Cargo description</span>
              <input
                type="text"
                required
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="e.g. 100kg rice"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Weight (kg)</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="100"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold text-ink">Mode</span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>

            {submitError ? <ErrorState message={submitError} /> : null}

            <button
              type="submit"
              disabled={!quote || submitting}
              className="w-full rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50"
            >
              {submitting ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </form>
        </Card>

        <Card className="p-5" tone="soft">
          <h3 className="mb-3 font-extrabold text-ink">Live Quote</h3>
          {!canQuote ? (
            <p className="text-sm text-muted">Fill in pickup, dropoff, and weight to get a live price.</p>
          ) : quoting ? (
            <LoadingState label="Calculating price..." />
          ) : quoteError ? (
            <ErrorState message={quoteError} />
          ) : quote ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <PackageCheck size={18} />
                <span className="text-sm font-semibold">Quote ready</span>
              </div>
              <p className="text-3xl font-extrabold text-ink">${quote.price.toLocaleString()}</p>
              <div className="space-y-1 text-sm text-muted">
                <p>{quote.distanceKm.toLocaleString()} km</p>
                <p>~{Math.round(quote.durationMinutes / 60)} hr transit</p>
                <p className="pt-1 text-xs">
                  {quote.pickup} → {quote.dropoff}
                </p>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
