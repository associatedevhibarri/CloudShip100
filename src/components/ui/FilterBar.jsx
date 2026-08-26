export function FilterBar({ children, className = '' }) {
  return (
    <div
      className={`mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-line bg-white p-3 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </div>
  )
}

export function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
        active ? 'bg-brand text-white' : 'bg-surface text-muted hover:bg-brand-light hover:text-brand'
      }`}
    >
      {children}
    </button>
  )
}
