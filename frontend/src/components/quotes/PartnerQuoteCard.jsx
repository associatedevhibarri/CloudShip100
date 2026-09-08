import { Clock, MapPin, Package, Star, Zap } from 'lucide-react'

const PARTNER_KIND = {
  uber_direct: { hint: 'Same-day courier' },
  courier_guy: { hint: 'Road delivery' },
  fedex: { hint: 'Express network' },
  dhl_express: { hint: 'International express' },
  dsv: { hint: 'XPress freight' },
}

const SPEED_BADGE = {
  economy: 'bg-slate-100 text-slate-700',
  standard: 'bg-sky-50 text-sky-800',
  premium: 'bg-amber-50 text-amber-900',
  on_demand: 'bg-emerald-50 text-emerald-800',
}

const formatMoney = (currency, amount) => {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'ZAR' }).format(value)
  } catch {
    return `${currency || ''} ${value.toLocaleString()}`
  }
}

const formatMinutes = (minutes) => {
  const n = Number(minutes)
  if (!Number.isFinite(n) || n <= 0) return null
  if (n < 60) return `${Math.round(n)} min`
  const hours = Math.floor(n / 60)
  const rest = Math.round(n % 60)
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

const formatTransit = (partner, routeDurationMinutes) => {
  if (Number.isFinite(Number(partner.transitDays)) && Number(partner.transitDays) > 0) {
    const days = Number(partner.transitDays)
    if (days === 0) return 'Same day'
    return days === 1 ? '1 day' : `${days} days`
  }
  return formatMinutes(partner.durationMinutes) || formatMinutes(routeDurationMinutes)
}

const formatExpiry = (iso) => {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function PartnerQuoteCard({
  partner,
  selected = false,
  cheapest = false,
  fastest = false,
  distanceKm = null,
  routeDurationMinutes = null,
  onSelect,
  onBook,
  booking = false,
  bookDisabled = false,
  showAction = true,
  actionLabel = 'Book now',
  bookingLabel = 'Booking...',
}) {
  const kind = PARTNER_KIND[partner.partnerId] || { hint: partner.serviceName || 'Delivery' }
  const speedLabel = partner.speedLabel || kind.hint
  const transit = formatTransit(partner, routeDurationMinutes)
  const pickupEta = formatMinutes(partner.pickupMinutes)
  const heldUntil = formatExpiry(partner.expiresAt)
  const serviceLabel = [partner.serviceName, partner.serviceCode].filter(Boolean).join(' · ') || kind.hint

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-[var(--shadow-card)] transition sm:p-5 ${
        selected ? 'border-brand ring-2 ring-brand/20' : 'border-line hover:border-brand/40'
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect?.(partner.quoteId)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              SPEED_BADGE[partner.speed] || 'bg-slate-100 text-slate-700'
            }`}
          >
            {speedLabel}
          </span>
          {cheapest ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              <Star size={12} /> Best price
            </span>
          ) : null}
          {fastest ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
              <Zap size={12} /> Fastest
            </span>
          ) : null}
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Live quote</span>
      </div>

      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold text-ink">{partner.partnerName}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{serviceLabel}</p>
        </div>

        <div className="text-sm">
          <p className="font-semibold text-ink">{transit || kind.hint}</p>
          <p className="mt-0.5 text-xs text-muted">
            {pickupEta
              ? `Pickup in ${pickupEta}`
              : partner.deliveryDate
                ? `Arrives ${partner.deliveryDate}`
                : distanceKm != null
                  ? `${distanceKm.toLocaleString()} km`
                  : 'Transit depends on the courier'}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <p className="text-2xl font-extrabold leading-none text-ink">
            {formatMoney(partner.currency, partner.sellPrice)}
          </p>
          <p className="text-xs text-muted">Onwards · includes CloudShip fee</p>
          {showAction ? (
            onBook ? (
              <button
                type="button"
                disabled={bookDisabled || booking}
                onClick={(e) => {
                  e.stopPropagation()
                  onBook(partner.quoteId)
                }}
                className="mt-1 rounded-full bg-brand-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50"
              >
                {booking && selected ? bookingLabel : actionLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect?.(partner.quoteId)
                }}
                className={`mt-1 rounded-full px-5 py-2 text-sm font-semibold ${
                  selected ? 'bg-brand-gradient text-white' : 'border border-line text-ink hover:border-brand'
                }`}
              >
                {selected ? 'Selected' : 'Select'}
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Package size={12} /> {kind.hint}
        </span>
        {distanceKm != null ? (
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} /> {distanceKm.toLocaleString()} km
          </span>
        ) : null}
        {transit ? (
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {transit} transit
          </span>
        ) : null}
        {heldUntil ? <span>Price held until {heldUntil}</span> : <span>Live courier price</span>}
      </div>
    </article>
  )
}
