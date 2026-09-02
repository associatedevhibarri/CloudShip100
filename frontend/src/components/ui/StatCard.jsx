export function StatCard({
  title,
  value,
  change,
  label,
  icon: Icon,
  tone = 'white',
  prefix = '',
  suffix = '',
}) {
  const isBrand = tone === 'brand'
  return (
    <div
      className={`rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] ${
        isBrand
          ? 'bg-brand-gradient text-white'
          : 'bg-white border border-line'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${isBrand ? 'text-white/80' : 'text-muted'}`}>{title}</p>
          <p className="mt-2 text-3xl font-800 font-extrabold tracking-tight">
            {prefix}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix}
          </p>
          <p className={`mt-2 text-sm ${isBrand ? 'text-white/85' : 'text-emerald-600'}`}>
            +{change}% {label}
          </p>
        </div>
        {Icon ? (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isBrand ? 'bg-white/15' : 'bg-brand-light text-brand'
            }`}
          >
            <Icon size={20} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
