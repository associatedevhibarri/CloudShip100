export const SPEED_FILTERS = [
  { id: 'all', label: 'All speeds' },
  { id: 'economy', label: 'Economy' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
  { id: 'on_demand', label: 'On-demand' },
]

export const SORT_OPTIONS = [
  { id: 'price', label: 'Lowest price' },
  { id: 'fastest', label: 'Fastest' },
  { id: 'partner', label: 'Partner A–Z' },
]

export function filterAndSortPartners(partners, { speed = 'all', partnerId = 'all', sort = 'price' } = {}) {
  let rows = Array.isArray(partners) ? [...partners] : []
  if (speed !== 'all') rows = rows.filter((row) => row.speed === speed)
  if (partnerId !== 'all') rows = rows.filter((row) => row.partnerId === partnerId)

  if (sort === 'fastest') {
    rows.sort((a, b) => {
      const da = Number.isFinite(a.durationMinutes) ? a.durationMinutes : Number.POSITIVE_INFINITY
      const db = Number.isFinite(b.durationMinutes) ? b.durationMinutes : Number.POSITIVE_INFINITY
      if (da !== db) return da - db
      return a.sellPrice - b.sellPrice
    })
  } else if (sort === 'partner') {
    rows.sort((a, b) => a.partnerName.localeCompare(b.partnerName) || a.sellPrice - b.sellPrice)
  } else {
    rows.sort((a, b) => a.sellPrice - b.sellPrice)
  }
  return rows
}

export function uniquePartners(partners) {
  const seen = new Map()
  ;(partners || []).forEach((row) => {
    if (!seen.has(row.partnerId)) seen.set(row.partnerId, row.partnerName)
  })
  return [...seen.entries()].map(([id, name]) => ({ id, name }))
}
