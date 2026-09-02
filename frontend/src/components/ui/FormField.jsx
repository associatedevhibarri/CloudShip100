const inputBase =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2'

export function FormField({
  id,
  label,
  required,
  error,
  hint,
  children,
  className = '',
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function formInputClass(error) {
  return `${inputBase} ${
    error
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : 'border-line focus:border-brand focus:ring-brand/20'
  }`
}

export function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3 border-b border-line/80 pb-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
        <Icon size={18} strokeWidth={2.25} />
      </div>
      <div>
        <h3 className="text-base font-extrabold text-ink">{title}</h3>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
    </div>
  )
}
