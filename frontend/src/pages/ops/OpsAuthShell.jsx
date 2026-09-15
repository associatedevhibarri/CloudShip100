import { useEffect } from 'react'
import { Logo } from '../../components/Logo'

export function OpsAuthShell({ eyebrow, title, subtitle, children, footer }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Cloud Ship'

    let robots = document.querySelector('meta[name="robots"]')
    const created = !robots
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    const previousRobots = robots.getAttribute('content')
    robots.setAttribute('content', 'noindex, nofollow')

    return () => {
      document.title = previousTitle
      if (created) {
        robots.remove()
      } else if (previousRobots != null) {
        robots.setAttribute('content', previousRobots)
      } else {
        robots.removeAttribute('content')
      }
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,#007bff33,transparent_38%),radial-gradient(circle_at_88%_88%,#0056b322,transparent_36%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#ffffff_1px,transparent_1px),linear-gradient(90deg,#ffffff_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
        <div className="mb-8">
          <Logo variant="brand" size="md" />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {eyebrow ? (
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-white/45">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm leading-relaxed text-white/60">{subtitle}</p> : null}
          <div className="mt-7">{children}</div>
        </div>

        {footer ? <div className="mt-6 text-center text-sm text-white/45">{footer}</div> : null}
      </div>
    </div>
  )
}

export const opsFieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand focus:ring-2 focus:ring-brand/30'

export const opsLabelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/45'
