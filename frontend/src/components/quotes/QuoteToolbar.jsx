import { SPEED_FILTERS, SORT_OPTIONS, uniquePartners } from './quoteFilters'
import { quoteFieldClass } from './quoteForm'

export function QuoteToolbar({ partners, speed, onSpeed, partnerId, onPartner, sort, onSort }) {
  const names = uniquePartners(partners)

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-ink">Speed</span>
        <select value={speed} onChange={(e) => onSpeed(e.target.value)} className={quoteFieldClass}>
          {SPEED_FILTERS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-ink">Partner</span>
        <select value={partnerId} onChange={(e) => onPartner(e.target.value)} className={quoteFieldClass}>
          <option value="all">All partners</option>
          {names.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm sm:col-span-2 lg:col-span-1">
        <span className="mb-1 block font-semibold text-ink">Sort</span>
        <select value={sort} onChange={(e) => onSort(e.target.value)} className={quoteFieldClass}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
