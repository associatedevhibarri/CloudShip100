import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { portalService } from '../../services/portalService'
import { PartnerQuoteCard } from '../../components/quotes/PartnerQuoteCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState } from '../../components/ui/LoadingState'

const PARTNER_NAMES = {
  courier_guy: 'Courier Guy',
  uber_direct: 'Uber Direct',
  fedex: 'FedEx',
  dhl_express: 'DHL Express',
  dsv: 'DSV',
  shop_table: 'Your table rate',
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

export function MarketplaceOrders({
  rows,
  token,
  payingId,
  payConfig,
  payLabel,
  onPay,
}) {
  const [openId, setOpenId] = useState(null)
  const [quotes, setQuotes] = useState({})

  const toggle = async (row) => {
    const next = openId === row.id ? null : row.id
    setOpenId(next)
    if (!next || quotes[row.id]?.quote || quotes[row.id]?.loading) return
    setQuotes((prev) => ({ ...prev, [row.id]: { loading: true, error: '', quote: null } }))
    try {
      const quote = await portalService.createMarketplaceQuote(token, {
        connectionId: row.storeConnection || undefined,
        pickup: row.pickup,
        dropoff: row.dropoff,
        weightKg: Number(row.weightKg) > 0 ? Number(row.weightKg) : 1,
        currency: row.currency || 'ZAR',
        mode: row.mode || 'Road',
      })
      setQuotes((prev) => ({ ...prev, [row.id]: { loading: false, error: '', quote } }))
    } catch (err) {
      setQuotes((prev) => ({
        ...prev,
        [row.id]: { loading: false, error: err.message || 'Could not load courier rates', quote: null },
      }))
    }
  }

  const canPay = (row) =>
    row.paymentStatus === 'awaiting' || (row.paymentStatus !== 'paid' && !row.logisticsBookingRef)

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface/80 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="w-10 px-3 py-3" />
            <th className="px-4 py-3 font-semibold">Booking</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Shop order</th>
            <th className="px-4 py-3 font-semibold">Cargo</th>
            <th className="px-4 py-3 font-semibold">Buyer</th>
            <th className="px-4 py-3 font-semibold">Price</th>
            <th className="px-4 py-3 font-semibold">Payment</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Courier ref</th>
            <th className="px-4 py-3 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = openId === row.id
            const panel = quotes[row.id]
            const partners = (panel?.quote?.options || []).map(toPartnerCard)
            const cheapestId = panel?.quote?.selected
              ? `${panel.quote.selected.partner}::${panel.quote.selected.service}::${panel.quote.selected.logisticsQuoteId || 'live'}`
              : partners[0]?.quoteId
            const fastest = [...partners].sort((a, b) => {
              const da = Number.isFinite(a.durationMinutes) ? a.durationMinutes : Number.POSITIVE_INFINITY
              const db = Number.isFinite(b.durationMinutes) ? b.durationMinutes : Number.POSITIVE_INFINITY
              return da - db
            })[0]
            return (
              <Fragment key={row.id}>
                <tr
                  className="cursor-pointer border-t border-line hover:bg-brand-light/40"
                  onClick={() => toggle(row)}
                >
                  <td className="px-3 py-3 text-muted">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{row.code}</td>
                  <td className="px-4 py-3 text-ink">{row.source}</td>
                  <td className="px-4 py-3 text-ink">{row.externalOrderId || '—'}</td>
                  <td className="px-4 py-3 text-ink">{row.cargo || '—'}</td>
                  <td className="px-4 py-3 text-ink">{row.buyerEmail || '—'}</td>
                  <td className="px-4 py-3 text-ink">R {row.quotedPrice ?? row.value}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.paymentStatus || 'not_required'} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status || 'pending'} />
                  </td>
                  <td className="px-4 py-3 text-ink">{row.logisticsBookingRef || '—'}</td>
                  <td className="px-4 py-3 text-ink">
                    {row.bookedAt ? new Date(row.bookedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
                {open ? (
                  <tr className="border-t border-line bg-surface/50">
                    <td colSpan={11} className="px-4 py-4">
                      <p className="mb-3 text-sm text-muted">
                        {row.pickup} → {row.dropoff}
                        {row.weightKg ? ` · ${row.weightKg} kg` : ''}
                        {canPay(row)
                          ? ' · Live rates from the courier engine. Pick one to pay and book.'
                          : ' · Booked courier is on this order. Fresh rates below are for comparison only.'}
                      </p>
                      {panel?.loading ? <LoadingState label="Checking Courier Guy, Uber, FedEx, DHL, DSV..." /> : null}
                      {panel?.error ? <p className="text-sm text-red-600">{panel.error}</p> : null}
                      {partners.length ? (
                        <ul className="grid gap-4">
                          {partners.map((partner) => {
                            const opt = panel.quote.options.find(
                              (o) =>
                                `${o.partner}::${o.service}::${o.logisticsQuoteId || 'live'}` === partner.quoteId
                            )
                            const selected =
                              row.selectedPartner === partner.partnerId || partner.quoteId === cheapestId
                            return (
                              <li key={partner.quoteId}>
                                <PartnerQuoteCard
                                  partner={partner}
                                  selected={selected}
                                  cheapest={partner.quoteId === cheapestId}
                                  fastest={fastest && partner.quoteId === fastest.quoteId}
                                  onBook={
                                    canPay(row) && opt
                                      ? () =>
                                          onPay(row, {
                                            quoteId: panel.quote.quoteId,
                                            partner: opt.partner,
                                            service: opt.service,
                                          })
                                      : undefined
                                  }
                                  showAction={canPay(row)}
                                  booking={payingId === row.id}
                                  bookDisabled={
                                    payingId === row.id || (payConfig.mode === 'stripe' && !payConfig.ready)
                                  }
                                  actionLabel={payLabel}
                                  bookingLabel="Paying…"
                                />
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}
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
