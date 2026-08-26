import { Link } from 'react-router-dom'
import { ArrowRight, Map, Route, Plane, Shield } from 'lucide-react'
import { Logo } from '../components/Logo'

const features = [
  {
    icon: Map,
    title: 'Live multimodal map',
    text: 'Track trucks, freighters, vessels, depots, and cargo in one command view.',
  },
  {
    icon: Route,
    title: 'Trip control towers',
    text: 'Starting soon, ending soon, and in-progress queues for road and air.',
  },
  {
    icon: Plane,
    title: 'Air + road + maritime assets',
    text: 'Yards, hangars, compliance docs, crew, and equipment in one ERP shell.',
  },
  {
    icon: Shield,
    title: 'Compliance & geofencing',
    text: 'Permits, inspections, country coverage, and restricted-zone rules.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#e8f3ff_0%,_#f5f7fb_45%,_#ffffff_100%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-ink hover:text-brand">
            Login
          </Link>
          <Link
            to="/login"
            className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/20 hover:brightness-105"
          >
            Open demo
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-8 lg:grid-cols-2 lg:pt-12">
        <div>
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.28em] text-brand">
            Cloud Ship 100
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            End-to-end logistics ERP that feels mission control.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
            A high-tech demo for road, rail, maritime, and air operations — trips, assets, wallets,
            geomapping, and customer deliveries — built frontend-first with rich dummy data.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 hover:brightness-105"
            >
              Launch operator ERP <ArrowRight size={16} />
            </Link>
            <Link
              to="/login?role=customer"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-bold text-ink hover:border-brand"
            >
              Customer portal
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-2xl backdrop-blur">
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-brand p-4 text-white">
                  <p className="text-xs text-white/80">Total Revenue</p>
                  <p className="mt-1 text-2xl font-extrabold">$24,580</p>
                  <p className="mt-1 text-xs">+12% from last month</p>
                </div>
                <div className="rounded-2xl border border-line bg-white p-4">
                  <p className="text-xs text-muted">Deliveries</p>
                  <p className="mt-1 text-2xl font-extrabold">1,245</p>
                  <p className="mt-1 text-xs text-emerald-600">+8% growth</p>
                </div>
              </div>
              <div className="h-36 rounded-2xl bg-[linear-gradient(180deg,#e8f3ff_0%,#ffffff_100%)] p-4">
                <p className="text-xs font-bold text-muted">Activity preview</p>
                <svg viewBox="0 0 320 80" className="mt-3 h-16 w-full">
                  <path
                    d="M0 60 C40 50, 60 20, 100 35 S160 70, 200 40 S260 10, 320 25"
                    fill="none"
                    stroke="#007BFF"
                    strokeWidth="3"
                  />
                  <path
                    d="M0 70 C50 65, 80 40, 120 50 S180 75, 220 55 S280 30, 320 45"
                    fill="none"
                    stroke="#4DA3FF"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="rounded-2xl border border-line bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Road Cargo</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  Southern Africa corridor · live vehicle clusters
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line/70 bg-white/60 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
                <Icon size={18} />
              </div>
              <h3 className="font-extrabold text-ink">{title}</h3>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        Cloud Ship 100 — demo frontend for logistics software services.
      </footer>
    </div>
  )
}
