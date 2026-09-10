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
  const [cargoCategory, setCargoCategory] = useState('SOLID')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('KG')
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
            cargoCategory,
            quantity,
            unit,
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
    cargoCategory,
    quantity,
    unit,
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
        cargoCategory,
        quantity,
        unit,
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
            <span className="mb-1 block font-semibold text-ink">Cargo Category</span>
            <select
              value={cargoCategory}
              onChange={(e) => setCargoCategory(e.target.value)}
              className={quoteFieldClass}
            >
              <option value="SOLID">📦 Solids (Parcels & Mass)</option>
              <option value="LIQUID">🛢️ Liquids (Bulk & Containers)</option>
              <option value="AGRICULTURAL">🌾 Agricultural Commodities</option>
              <option value="GAS">⛽ Gas / Normalized Volume</option>
              <option value="CONTAINER">🚢 Cargo Containers (TEU/FEU)</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-ink">Quantity & Unit</span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className={quoteFieldClass}
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={quoteFieldClass}
              >
                <optgroup label="Solids - Mass Units">
                  <option value="KG">Kilogram (kg)</option>
                  <option value="TONNE">Tonne / Metric ton (t)</option>
                  <option value="GRAM">Gram (g)</option>
                  <option value="US_TON">Short ton (US ton)</option>
                  <option value="IMPERIAL_TON">Long ton (imperial ton)</option>
                  <option value="LB">Pound (lb)</option>
                </optgroup>
                <optgroup label="Solids - Volume Units">
                  <option value="M3">Cubic meter (m³)</option>
                  <option value="FT3">Cubic foot (ft³)</option>
                  <option value="YD3">Cubic yard (yd³)</option>
                </optgroup>
                <optgroup label="Liquids - Volume & Bulk">
                  <option value="L">Liter (L)</option>
                  <option value="ML">Milliliter (mL)</option>
                  <option value="M3">Cubic meter (m³)</option>
                  <option value="DM3">Cubic decimeter (dm³)</option>
                  <option value="HL">Hectoliter (hL)</option>
                  <option value="US_GAL">Gallon (US gal)</option>
                  <option value="IMP_GAL">Gallon (Imperial gal)</option>
                  <option value="QUART">Quart</option>
                  <option value="PINT">Pint</option>
                  <option value="FL_OZ">Fluid ounce (US/Imp)</option>
                  <option value="BBL">Barrel (bbl - 42 US gal)</option>
                  <option value="DRUM">Drum (200 L / 55 gal)</option>
                  <option value="IBC">IBC tank (1000 L standard)</option>
                  <option value="TANKER_TRUCK">Tanker truck volume (m³)</option>
                  <option value="TANK_CONTAINER">Tank container volume (ISO tank, m³)</option>
                </optgroup>
                <optgroup label="Agricultural Commodity Units">
                  <option value="BUSHEL">Bushel (bu)</option>
                  <option value="PECK">Peck</option>
                  <option value="SACK">Sack (50kg)</option>
                  <option value="BALE">Bale (220kg)</option>
                  <option value="PICUL">Picul (60kg)</option>
                </optgroup>
                <optgroup label="Construction Bulk Units">
                  <option value="LOAD_BUCKET">Load / bucket volume (m³)</option>
                  <option value="AGGREGATE_TRUCKLOAD">Aggregate truckload volume (m³ or yd³)</option>
                </optgroup>
                <optgroup label="Gas - Volume & Energy Equivalent">
                  <option value="NM3">Normal cubic meter (Nm³)</option>
                  <option value="SCM">Standard cubic meter (SCM)</option>
                  <option value="SCF">Standard cubic foot (SCF)</option>
                  <option value="MMBTU">MMBtu (million BTU)</option>
                  <option value="MBTU">MBtu</option>
                  <option value="THERM">Therm</option>
                  <option value="GJ">GJ (gigajoule)</option>
                  <option value="KWH">kWh (electricity-equivalent gas)</option>
                </optgroup>
                <optgroup label="International Cargo & Containers">
                  <option value="TEU">TEU (20-foot Container)</option>
                  <option value="FEU">FEU (40-foot Container)</option>
                  <option value="DWT">Deadweight ton (DWT)</option>
                  <option value="DISPLACEMENT_TON">Displacement ton</option>
                  <option value="LIGHTSHIP_TON">Lightship ton</option>
                </optgroup>
              </select>
            </div>
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
