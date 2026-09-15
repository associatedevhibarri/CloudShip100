import { Link, NavLink } from 'react-router-dom'
import { Logo } from '../Logo'

const textNavClass = ({ isActive }) =>
  `rounded-full px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-brand-light text-brand' : 'text-ink hover:bg-brand-light hover:text-brand'
  }`

export function MarketingLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,#007bff22,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f012_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f012_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
      />

      <header className="sticky top-0 z-50 border-b border-line/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" aria-label="Cloud Ship home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <NavLink to="/blog" className={textNavClass}>
              Blog
            </NavLink>
            <Link
              to="/login"
              className="rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-brand-light hover:text-brand"
            >
              Login
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition hover:brightness-105"
            >
              Try Demo
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="relative border-t border-line bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:px-6 sm:text-left">
          <Link to="/" aria-label="Cloud Ship home">
            <Logo size="sm" />
          </Link>
          <p className="text-sm text-muted">
            Made with <span className="text-brand">♡</span> by{' '}
            <a
              href="https://hibarri.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand transition hover:underline"
            >
              Hibarri
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
