import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { portalService } from '../../services/portalService'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'
import { PartnerQuoteCard } from '../../components/quotes/PartnerQuoteCard'
import { QuoteToolbar } from '../../components/quotes/QuoteToolbar'
import { filterAndSortPartners } from '../../components/quotes/quoteFilters'
import { MODES, quoteFieldClass, todayIsoDate, toQuotePayload } from '../../components/quotes/quoteForm'

export default function CustomerNewBookingPage() {
  const { tokens } = useAuth()
  const navigate = useNavigate()

  const [pickup, setPickup] = useState('')
  const [collectionBuildingType, setCollectionBuildingType] = useState('COMMERCIAL')
  const [dropoff, setDropoff] = useState('')
  const [deliveryBuildingType, setDeliveryBuildingType] = useState('RESIDENTIAL')
  const [cargo, setCargo] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [lengthCm, setLengthCm] = useState('20')
  const [widthCm, setWidthCm] = useState('20')
  const [heightCm, setHeightCm] = useState('20')
  const [declaredValue, setDeclaredValue] = useState('')
  const [pickupDate, setPickupDate] = useState(todayIsoDate())
  const [mode, setMode] = useState('Road')

  const [quote, setQuote] = useState(null)
  const [quoting, setQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const [selectedQuoteId, setSelectedQuoteId] = useState(null)
  const [speedFilter, setSpeedFilter] = useState('all')
  const [partnerFilter, setPartnerFilter] = useState('all')
  const [sort, setSort] = useState('price')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const canQuote = pickup.trim() && dropoff.trim() && Number(weightKg) > 0
  const visiblePartners = useMemo(
    () =>
      filterAndSortPartners(quote?.partners || [], {
        speed: speedFilter,
        partnerId: partnerFilter,
        sort,
      }),
    [quote, speedFilter, partnerFilter, sort],
  )

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
        const result = await portalService.getQuote(
          toQuotePayload({
            pickup,
            collectionBuildingType,
            dropoff,
            deliveryBuildingType,
            cargo,
            weightKg,
            lengthCm,
            widthCm,
            heightCm,
            declaredValue,
            pickupDate,
            mode,
          }),
        )
        setQuote(result)
        setSelectedQuoteId(result.selected?.quoteId || result.partners?.[0]?.quoteId || null)
      } catch (err) {
        setQuote(null)
        setQuoteError(err.message || 'Could not calculate a price')
      } finally {
        setQuoting(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [
    pickup,
    collectionBuildingType,
    dropoff,
    deliveryBuildingType,
    cargo,
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    declaredValue,
    pickupDate,
    mode,
    canQuote,
  ])

  const bookQuote = async (quoteId) => {
    if (!cargo.trim()) {
      setSubmitError('Add a cargo description before booking.')
      return
    }
    setSelectedQuoteId(quoteId)
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = toQuotePayload({
        pickup,
        collectionBuildingType,
        dropoff,
        deliveryBuildingType,
        cargo,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        declaredValue,
        pickupDate,
        mode,
      })
      const booking = await portalService.createBooking(tokens?.access?.token, {
        ...payload,
        cargo: cargo.trim(),
        quoteId,
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
      <PageHeader title="New Booking" subtitle="Compare live courier prices, then book." />

      <Card className="p-5">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-ink">Pickup address</span>
            <input
              type="text"
              required
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="Street, city, postal code, country"
              className={quoteFieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Pickup Building Type</span>
            <select
              value={collectionBuildingType}
              onChange={(e) => setCollectionBuildingType(e.target.value)}
              className={quoteFieldClass}
            >
              <option value="RESIDENTIAL">🏠 Residential</option>
              <option value="COMMERCIAL">🏬 Commercial</option>
              <option value="INDUSTRIAL">🏭 Industrial Warehouse</option>
              <option value="MINING_FACILITY">⛏️ Mining Facility</option>
              <option value="FARM">🚜 Agricultural (Farm)</option>
              <option value="STORAGE">📦 Storage / Bonded</option>
              <option value="CONSTRUCTION_SITE_OFFICE">🏗️ Construction Site</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-ink">Dropoff address</span>
            <input
              type="text"
              required
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              placeholder="Street, city, postal code, country"
              className={quoteFieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Dropoff Building Type</span>
            <select
              value={deliveryBuildingType}
              onChange={(e) => setDeliveryBuildingType(e.target.value)}
              className={quoteFieldClass}
            >
              <option value="RESIDENTIAL">🏠 Residential</option>
              <option value="COMMERCIAL">🏬 Commercial</option>
              <option value="INDUSTRIAL">🏭 Industrial Warehouse</option>
              <option value="MINING_FACILITY">⛏️ Mining Facility</option>
              <option value="FARM">🚜 Agricultural (Farm)</option>
              <option value="STORAGE">📦 Storage / Bonded</option>
              <option value="CONSTRUCTION_SITE_OFFICE">🏗️ Construction Site</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block font-semibold text-ink">Cargo description</span>
            <input
              type="text"
              required
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="e.g. 100kg rice"
              className={quoteFieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">When</span>
            <input
              type="date"
              value={pickupDate}
              min={todayIsoDate()}
              onChange={(e) => setPickupDate(e.target.value)}
              className={quoteFieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Weight (kg)</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              required
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="10"
              className={quoteFieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Length (cm)</span>
            <input
              type="number"
              min="1"
              value={lengthCm}
              onChange={(e) => setLengthCm(e.target.value)}
              className={quoteFieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Width (cm)</span>
            <input
              type="number"
              min="1"
              value={widthCm}
              onChange={(e) => setWidthCm(e.target.value)}
              className={quoteFieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Height (cm)</span>
            <input
              type="number"
              min="1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className={quoteFieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Declared value</span>
            <input
              type="number"
              min="0"
              value={declaredValue}
              onChange={(e) => setDeclaredValue(e.target.value)}
              placeholder="Optional"
              className={quoteFieldClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={quoteFieldClass}>
              {MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </form>
      </Card>

      <div className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-ink">Available services</h2>
            <p className="text-sm text-muted">Every live economy, standard, premium, and on-demand rate for this lane.</p>
          </div>
          {visiblePartners.length ? (
            <p className="text-sm font-semibold text-ink">
              {visiblePartners.length} option{visiblePartners.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>

        {quote?.partners?.length ? (
          <QuoteToolbar
            partners={quote.partners}
            speed={speedFilter}
            onSpeed={setSpeedFilter}
            partnerId={partnerFilter}
            onPartner={setPartnerFilter}
            sort={sort}
            onSort={setSort}
          />
        ) : null}

        {submitError ? (
          <div className="mb-4">
            <ErrorState message={submitError} />
          </div>
        ) : null}

        {!canQuote ? (
          <Card className="p-6">
            <p className="text-sm text-muted">Enter pickup, dropoff, and weight to compare couriers.</p>
          </Card>
        ) : quoting ? (
          <Card className="p-6">
            <LoadingState label="Finding couriers..." />
          </Card>
        ) : quoteError ? (
          <ErrorState message={quoteError} />
        ) : visiblePartners.length ? (
          <ul className="grid gap-4">
            {visiblePartners.map((partner) => (
              <li key={partner.quoteId || `${partner.partnerId}-${partner.serviceCode}`}>
                <PartnerQuoteCard
                  partner={partner}
                  selected={partner.quoteId === selectedQuoteId}
                  cheapest={partner.quoteId === quote.selected?.quoteId}
                  fastest={partner.quoteId === quote.fastest?.quoteId}
                  distanceKm={quote.distanceKm}
                  routeDurationMinutes={quote.durationMinutes}
                  onSelect={setSelectedQuoteId}
                  onBook={bookQuote}
                  booking={submitting && partner.quoteId === selectedQuoteId}
                  bookDisabled={submitting}
                />
              </li>
            ))}
          </ul>
        ) : quote?.partners?.length ? (
          <Card className="p-6">
            <p className="text-sm text-muted">No services match those filters. Try All speeds or another partner.</p>
          </Card>
        ) : (
          <Card className="p-6">
            <p className="text-sm text-muted">
              No couriers are available for this route yet. Use a full street address with city, postal code, and
              country — for example two cities in South Africa, or two addresses in the same city.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
