import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function PublicAuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-soft-gradient px-4 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-line bg-white p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6">
          <Logo />
        </div>
        <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 text-sm text-muted">{footer}</div> : (
          <p className="mt-6 text-sm text-muted">
            <Link to="/login" className="font-semibold text-brand">
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export const publicFieldClass =
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'

export const publicLabelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted'
