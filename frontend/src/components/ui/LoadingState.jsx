export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm font-semibold text-muted">
      <div className="h-5 w-5 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      {label}
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
      {message}
    </div>
  )
}
