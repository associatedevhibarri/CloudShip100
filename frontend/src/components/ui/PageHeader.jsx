export const DEMO_REASONS = {
  fleet:
    'Pending a fleet registry. Drivers only store an assigned-vehicle name, not a catalog of trucks, trailers, yards, or aircraft.',
  fuel: 'Pending a fuel ledger. Customer invoices are receivables, not fuel purchases.',
  yardFees:
    'Pending a yard-fee expense model. Customer invoices are not parking or handling charges.',
  airportFees:
    'Pending an airport-fee expense model. Customer invoices are not landing or handling charges.',
  salaries: 'Pending a payroll model. Driver and crew profiles do not store salary.',
  weather: 'Weather is empty until a yard or geofence has saved coordinates. Open-Meteo then fills live conditions.',
  mapGps:
    'No live GPS ping yet. Drivers share location from the driver portal (phone GPS). The map stays empty until a ping exists.',
}

export function DemoDataNote({ children = 'Sample figures, not live.' }) {
  return (
    <p className="mt-2 inline-flex max-w-2xl items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold leading-snug text-amber-900">
      <span className="mt-px shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
        Demo
      </span>
      <span>{children}</span>
    </p>
  )
}

export function PageHeader({ title, subtitle, actions, demo = false }) {
  const reason = demo === true ? 'Sample figures, not live. Live data is pending for this page.' : demo || null

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        {reason ? <DemoDataNote>{reason}</DemoDataNote> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
