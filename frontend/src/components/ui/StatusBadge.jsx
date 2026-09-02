const styles = {
  compliant: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  expiring: 'bg-amber-50 text-amber-700 border-amber-100',
  non_compliant: 'bg-rose-50 text-rose-700 border-rose-100',
  starting_soon: 'bg-sky-50 text-sky-700 border-sky-100',
  ending_soon: 'bg-orange-50 text-orange-700 border-orange-100',
  in_progress: 'bg-brand-light text-brand-dark border-brand/20',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  assigned: 'bg-violet-50 text-violet-700 border-violet-100',
  picked_up: 'bg-sky-50 text-sky-700 border-sky-100',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  under_review: 'bg-amber-50 text-amber-700 border-amber-100',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  open: 'bg-amber-50 text-amber-700 border-amber-100',
  minor: 'bg-amber-50 text-amber-700 border-amber-100',
  major: 'bg-rose-50 text-rose-700 border-rose-100',
  pending: 'bg-violet-50 text-violet-700 border-violet-100',
  in_transit: 'bg-brand-light text-brand-dark border-brand/20',
  history: 'bg-slate-100 text-slate-600 border-slate-200',
  Open: 'bg-amber-50 text-amber-700 border-amber-100',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Available: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  received: 'bg-slate-100 text-slate-700 border-slate-200',
  labelled: 'bg-sky-50 text-sky-700 border-sky-100',
  batched: 'bg-violet-50 text-violet-700 border-violet-100',
  assigned: 'bg-brand-light text-brand-dark border-brand/20',
  dispatched: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  out_for_delivery: 'bg-brand-light text-brand-dark border-brand/20',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  own: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  subcontractor: 'bg-amber-50 text-amber-800 border-amber-100',
  ready: 'bg-sky-50 text-sky-700 border-sky-100',
  open: 'bg-amber-50 text-amber-700 border-amber-100',
  suggested: 'bg-violet-50 text-violet-700 border-violet-100',
  active: 'bg-brand-light text-brand-dark border-brand/20',
  loading: 'bg-orange-50 text-orange-700 border-orange-100',
  on_route: 'bg-brand-light text-brand-dark border-brand/20',
  available: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  default: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function StatusBadge({ status }) {
  const key = status || 'default'
  const label = String(status || '').replaceAll('_', ' ')
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[key] || styles.default
      }`}
    >
      {label}
    </span>
  )
}
