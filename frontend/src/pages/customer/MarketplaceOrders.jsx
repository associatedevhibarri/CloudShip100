import { Fragment, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { portalService } from '../../services/portalService'
import { PartnerQuoteCard } from '../../components/quotes/PartnerQuoteCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'
import { TransitTimeline } from '../../components/ui/TransitTimeline'
import { FormField, formInputClass } from '../../components/ui/FormField'
import { displayShipmentStatus, displayShipmentLabel } from '../../utils/shipmentProgress'

const PARTNER_NAMES = {
  courier_guy: 'Courier Guy',
  uber_direct: 'Uber Direct',
  fedex: 'FedEx',
  dhl_express: 'DHL Express',
  dsv: 'DSV',
  shop_table: 'Your table rate',
}

const TABLE_COL_COUNT = 14

const formatMoney = (currency, amount) => {
  if (amount == null || amount === '') return '—'
  const value = Number(amount)
  if (!Number.isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'ZAR' }).format(value)
  } catch {
    return `${currency || 'R'} ${value.toLocaleString()}`
  }
}

const partnerLabel = (row) => {
  const booked = row.paymentStatus === 'paid' || Boolean(row.logisticsBookingRef)
  if (!booked) return null
  return PARTNER_NAMES[row.selectedPartner || row.partnerId] || row.selectedPartner || row.partnerName || null
}

const bookedService = (row) => {
  if (row.paymentStatus !== 'paid' && !row.logisticsBookingRef) return null
  return row.selectedService || row.serviceName || null
}

const toPartnerCard = (opt) => ({
  partnerId: opt.partner,
  partnerName: PARTNER_NAMES[opt.partner] || opt.partner,
  serviceName: opt.service,
  serviceCode: opt.service,
  sellPrice: opt.quotedPrice,
  partnerPrice: opt.carrierCost,
  marginAmount: opt.marginAmount,
  quoteId: `${opt.partner}::${opt.service}::${opt.logisticsQuoteId || 'live'}`,
  currency: opt.currency || 'ZAR',
  durationMinutes: opt.etaHours != null ? Number(opt.etaHours) * 60 : null,
  speed: opt.partner === 'uber_direct' ? 'on_demand' : 'standard',
})

const connectionIdOf = (row) => {
  const raw = row.storeConnection
  if (!raw) return undefined
  if (typeof raw === 'string') return raw
  return raw.id || raw._id || undefined
}

const storeNameOf = (row, stores) => {
  const connId = String(connectionIdOf(row) || '')
  const store = (stores || []).find((s) => String(s.id) === connId)
  return store?.storeName || store?.name || null
}

const warehousesFor = (row, stores) => {
  const connId = String(connectionIdOf(row) || '')
  const store = (stores || []).find((s) => String(s.id) === connId)
  const settings = store?.settings || {}
  const locs = Array.isArray(settings.pickupLocations) ? settings.pickupLocations : []
  const rows = locs
    .filter((loc) => loc && loc.address)
    .map((loc) => ({
      name: loc.name || 'Warehouse',
      address: loc.address,
      isDefault: Boolean(loc.isDefault),
    }))
  if (!rows.length && settings.pickupAddress) {
    rows.push({ name: 'Main warehouse', address: settings.pickupAddress, isDefault: true })
  }
  const current = String(row.pickup || '').trim()
  if (current && !rows.some((loc) => loc.address.trim().toLowerCase() === current.toLowerCase())) {
    rows.unshift({ name: row.pickupName || 'On this order', address: current, isDefault: false })
  }
  return rows
}

const matchWarehouse = (warehouses, address) => {
  const target = String(address || '').trim().toLowerCase()
  return warehouses.find((loc) => loc.address.trim().toLowerCase() === target) || warehouses[0] || null
}

const Detail = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
    <p className="mt-0.5 break-words text-sm text-ink">{value || '—'}</p>
  </div>
)

const ShopOrderDetails = ({ row, stores, money }) => {
  const items = Array.isArray(row.lineItems) ? row.lineItems : []
  return (
    <div className="mb-4 rounded-xl border border-line bg-white px-3 py-3 sm:px-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Order details</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Store" value={storeNameOf(row, stores)} />
        <Detail label="Buyer phone" value={row.buyerPhone} />
        <Detail label="Weight" value={row.weightKg ? `${row.weightKg} kg` : null} />
        <Detail label="Service" value={bookedService(row)} />
        <Detail label="Ship from" value={row.pickupName ? `${row.pickupName} · ${row.pickup}` : row.pickup} />
        <Detail label="Ship to" value={row.dropoff} />
        <Detail label="Items total" value={money(row.itemsTotal)} />
        <Detail label="Shipping (shop)" value={money(row.shippingTotal)} />
        <Detail label="Order total" value={money(row.orderTotal)} />
      </div>
      {items.length ? (
        <ul className="mt-3 divide-y divide-line border-t border-line text-sm">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 py-2">
              <span className="text-ink">
                {item.quantity > 1 ? `${item.quantity} × ` : ''}
                {item.name}
              </span>
              <span className="whitespace-nowrap text-muted">{money(item.total)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function MarketplaceOrders({
  rows,
  stores = [],
  token,
  payingId,
  payingQuoteId,
  payConfig,
  payLabel,
  onPay,
  onRetryBook,
}) {
  const [openId, setOpenId] = useState(null)
  const [quotes, setQuotes] = useState({})
  const [pickupById, setPickupById] = useState({})
  const quoteSeq = useRef({})

  const canPay = (row) =>
    row.paymentStatus === 'awaiting' || (row.paymentStatus !== 'paid' && !row.logisticsBookingRef)

  const needsRetryBook = (row) =>
    row.paymentStatus === 'paid' && !row.logisticsBookingRef && Boolean(row.paymentIntentId)

  const shipmentStatus = (row) => displayShipmentStatus(row)

  const loadQuote = async (row, pickup) => {
    const warehouses = warehousesFor(row, stores)
    const chosen = matchWarehouse(warehouses, pickup || row.pickup)
    const address = chosen?.address || String(pickup || row.pickup || '').trim()
    const seq = (quoteSeq.current[row.id] || 0) + 1
    quoteSeq.current[row.id] = seq
    setQuotes((prev) => ({
      ...prev,
      [row.id]: { loading: true, error: '', quote: null, requestedPickup: address, seq },
    }))
    try {
      const quote = await portalService.createMarketplaceQuote(token, {
        connectionId: connectionIdOf(row),
        pickup: address,
        pickupName: chosen?.name,
        lockPickup: true,
        dropoff: row.dropoff,
        weightKg: Number(row.weightKg) > 0 ? Number(row.weightKg) : 1,
        currency: row.currency || 'ZAR',
        mode: row.mode || 'Road',
      })
      if (quoteSeq.current[row.id] !== seq) return
      setQuotes((prev) => {
        if (prev[row.id]?.seq !== seq) return prev
        return { ...prev, [row.id]: { loading: false, error: '', quote, requestedPickup: address, seq } }
      })
    } catch (err) {
      if (quoteSeq.current[row.id] !== seq) return
      setQuotes((prev) => {
        if (prev[row.id]?.seq !== seq) return prev
        return {
          ...prev,
          [row.id]: {
            loading: false,
            error: err.message || 'Could not load courier rates',
            quote: null,
            requestedPickup: address,
            seq,
          },
        }
      })
    }
  }

  const toggle = async (row) => {
    const next = openId === row.id ? null : row.id
    setOpenId(next)
    if (!next || !canPay(row)) return
    const warehouses = warehousesFor(row, stores)
    const chosen = matchWarehouse(warehouses, pickupById[row.id] || row.pickup)
    const address = chosen?.address || row.pickup
    setPickupById((prev) => (prev[row.id] ? prev : { ...prev, [row.id]: address }))
    if (quotes[row.id]?.quote || quotes[row.id]?.loading) return
    await loadQuote(row, address)
  }

  const changeWarehouse = async (row, address) => {
    setPickupById((prev) => ({ ...prev, [row.id]: address }))
    await loadQuote(row, address)
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface/80 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="w-10 px-3 py-3" />
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Booking</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Source</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Shop order</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Cargo</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Buyer</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Total</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Shipping</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Delivery partner</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Payment</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Status</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Tracking</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Courier ref</th>
            <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = openId === row.id
            const awaitingPay = canPay(row)
            const retryBook = needsRetryBook(row)
            const panel = quotes[row.id]
            const warehouses = warehousesFor(row, stores)
            const shipFrom =
              pickupById[row.id] || matchWarehouse(warehouses, row.pickup)?.address || row.pickup
            const originLabel = awaitingPay
              ? panel?.quote?.pickupName
                ? `${panel.quote.pickupName} · ${panel.quote.pickup}`
                : panel?.quote?.pickup || shipFrom
              : row.pickupName
                ? `${row.pickupName} · ${row.pickup}`
                : row.pickup
            const partners = awaitingPay ? (panel?.quote?.options || []).map(toPartnerCard) : []
            const cheapestId = panel?.quote?.selected
              ? `${panel.quote.selected.partner}::${panel.quote.selected.service}::${panel.quote.selected.logisticsQuoteId || 'live'}`
              : partners[0]?.quoteId
            const fastest = [...partners].sort((a, b) => {
              const da = Number.isFinite(a.durationMinutes) ? a.durationMinutes : Number.POSITIVE_INFINITY
              const db = Number.isFinite(b.durationMinutes) ? b.durationMinutes : Number.POSITIVE_INFINITY
              return da - db
            })[0]
            const courierLabel = partnerLabel(row) || 'Courier'
            const money = formatMoney.bind(null, row.currency)
            return (
              <Fragment key={row.id}>
                <tr
                  className="cursor-pointer border-t border-line hover:bg-brand-light/40"
                  onClick={() => toggle(row)}
                >
                  <td className="px-3 py-3 text-muted">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{row.code}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">{row.source}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">{row.externalOrderId || '—'}</td>
                  <td className="max-w-[14rem] truncate px-4 py-3 text-ink" title={row.cargo || ''}>
                    {row.cargo || '—'}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <div>{row.buyerEmail || '—'}</div>
                    {row.buyerPhone ? <div className="text-xs text-muted">{row.buyerPhone}</div> : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{money(row.orderTotal)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">{money(row.quotedPrice ?? row.value)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">
                    {partnerLabel(row) || 'Not selected'}
                    {bookedService(row) ? <div className="text-xs text-muted">{bookedService(row)}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.paymentStatus || 'not_required'} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={displayShipmentLabel(row)} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-ink">{row.trackingNumber || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-ink">{row.logisticsBookingRef || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink">
                    {row.bookedAt ? new Date(row.bookedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
                {open ? (
                  <tr className="border-t border-line bg-surface/50">
                    <td colSpan={TABLE_COL_COUNT} className="px-4 py-4">
                      <ShopOrderDetails row={row} stores={stores} money={money} />
                      {awaitingPay && warehouses.length ? (
                        <div className="mb-3 max-w-xl" onClick={(e) => e.stopPropagation()}>
                          <FormField
                            id={`warehouse-${row.id}`}
                            label="Ship from"
                            hint="Pick the warehouse this order is sitting at. Live rates use that origin."
                          >
                            <select
                              id={`warehouse-${row.id}`}
                              className={formInputClass()}
                              value={shipFrom}
                              onChange={(e) => changeWarehouse(row, e.target.value)}
                            >
                              {warehouses.map((loc) => (
                                <option key={loc.address} value={loc.address}>
                                  {loc.name}
                                  {loc.isDefault ? ' (Default)' : ''} — {loc.address}
                                </option>
                              ))}
                            </select>
                          </FormField>
                        </div>
                      ) : null}
                      <p className="mb-3 text-sm text-muted">
                        {originLabel} → {row.dropoff}
                        {row.weightKg ? ` · ${row.weightKg} kg` : ''}
                        {awaitingPay
                          ? ' · Live rates from the courier engine. Pick one to pay and book.'
                          : retryBook
                            ? ' · Payment captured but courier book failed — retry booking.'
                            : ` · ${courierLabel}${row.selectedService ? ` ${row.selectedService}` : ''} is booked.`}
                      </p>
                      {retryBook ? (
                        <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={payingId === row.id || !onRetryBook}
                            onClick={() => onRetryBook?.(row)}
                            className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50"
                          >
                            {payingId === row.id ? 'Retrying…' : 'Retry courier book'}
                          </button>
                        </div>
                      ) : null}
                      {row.trackingNumber ? (
                        <p className="mb-3 text-sm text-ink">
                          Tracking <span className="font-mono font-semibold">{row.trackingNumber}</span>
                          {' · '}
                          <a
                            className="font-semibold text-brand underline"
                            href={`/embed/track?code=${encodeURIComponent(row.code)}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open tracking page
                          </a>
                          {row.trackingUrl ? (
                            <>
                              {' · '}
                              <a
                                className="font-semibold text-brand underline"
                                href={row.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Courier tracking
                              </a>
                            </>
                          ) : null}
                        </p>
                      ) : null}

                      {awaitingPay ? (
                        <>
                          {panel?.loading ? <LoadingState label="Checking Courier Guy, Uber, FedEx, DHL, DSV..." /> : null}
                          {panel?.error ? <p className="text-sm text-red-600">{panel.error}</p> : null}
                          {!panel?.loading && !panel?.error && !partners.length && panel?.quote ? (
                            <p className="text-sm text-muted">
                              No courier can book this warehouse and destination. Check the skip reasons, or pick another
                              ship-from location.
                            </p>
                          ) : null}
                          {partners.length ? (
                            <ul className="grid gap-4">
                              {partners.map((partner) => {
                                const opt = panel.quote.options.find(
                                  (o) =>
                                    `${o.partner}::${o.service}::${o.logisticsQuoteId || 'live'}` === partner.quoteId
                                )
                                const payingThis = payingId === row.id && payingQuoteId === partner.quoteId
                                return (
                                  <li key={partner.quoteId} onClick={(e) => e.stopPropagation()}>
                                    <PartnerQuoteCard
                                      partner={partner}
                                      selected={payingThis}
                                      cheapest={partner.quoteId === cheapestId}
                                      fastest={fastest && partner.quoteId === fastest.quoteId}
                                      onBook={
                                        awaitingPay && opt
                                          ? () =>
                                              onPay(row, {
                                                quoteId: panel.quote.quoteId,
                                                partner: opt.partner,
                                                service: opt.service,
                                                quoteKey: partner.quoteId,
                                              })
                                          : undefined
                                      }
                                      showAction={awaitingPay}
                                      booking={payingThis}
                                      bookDisabled={
                                        Boolean(payingId) || (payConfig.mode === 'stripe' && !payConfig.ready)
                                      }
                                      actionLabel={payLabel}
                                      bookingLabel="Paying…"
                                    />
                                  </li>
                                )
                              })}
                            </ul>
                          ) : null}
                          {Array.isArray(panel?.quote?.skipped) && panel.quote.skipped.length ? (
                            <ul className="mt-3 grid gap-1 text-xs text-muted">
                              {panel.quote.skipped.map((skipped) => (
                                <li key={skipped.partner}>
                                  {PARTNER_NAMES[skipped.partner] || skipped.partner} skipped: {skipped.error}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </>
                      ) : (
                        <div className="rounded-xl border border-line bg-white px-3 py-4 sm:px-5">
                          <TransitTimeline timeline={row.timeline} status={shipmentStatus(row)} />
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
