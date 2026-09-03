import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Map,
  Route,
  Plane,
  Bell,
  UserCheck,
  Plug,
  Store,
  ShieldCheck,
  Clock,
  Globe2,
  Calculator,
  Ship,
  Truck,
  Warehouse,
  Send,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { portalService } from '../services/portalService'
import { ErrorState } from '../components/ui/LoadingState'

const MODES = ['Road', 'Air', 'Maritime', 'Rail']

function LivePricingWidget() {
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [mode, setMode] = useState('Road')
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleQuote = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setQuote(null)
    try {
      const result = await portalService.getQuote({
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        weightKg: Number(weightKg),
        mode,
      })
      setQuote(result)
    } catch (err) {
      setError(err.message || 'Could not calculate a price')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
      <form onSubmit={handleQuote} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-ink">Pickup</span>
          <input
            type="text"
            required
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="e.g. Durban, South Africa"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-ink">Dropoff</span>
          <input
            type="text"
            required
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="e.g. Johannesburg, South Africa"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-ink">Weight (kg)</span>
          <input
            type="number"
            min="1"
            required
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="100"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-ink">Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand/20 transition hover:brightness-105 disabled:opacity-60 sm:col-span-2"
        >
          <Calculator size={16} />
          {loading ? 'Calculating...' : 'Calculate Price'}
        </button>
      </form>

      {error ? (
        <div className="mt-5">
          <ErrorState message={error} />
        </div>
      ) : null}
      {quote ? (
        <div className="mt-6 rounded-2xl border border-brand/15 bg-brand-light/40 p-5 text-center">
          <p className="text-3xl font-extrabold text-ink">${quote.price.toLocaleString()}</p>
          <p className="mt-1 text-sm text-muted">
            {quote.distanceKm.toLocaleString()} km · ~{Math.round(quote.durationMinutes / 60)} hr transit
          </p>
          <Link
            to="/login?role=customer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
          >
            Sign up to book this shipment
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}
    </div>
  )
}

const trustBadges = [
  { icon: ShieldCheck, label: 'Enterprise-grade security' },
  { icon: Clock, label: 'Built for zero downtime' },
  { icon: Globe2, label: 'Road · Rail · Air · Maritime' },
]

const features = [
  {
    icon: Map,
    title: 'Live Multimodal Map',
    text: 'A high-tech operating system for road, rail, maritime and air operations.',
    accent: 'from-sky-500/15 to-brand/5',
  },
  {
    icon: Route,
    title: 'Trip Control Towers',
    text: 'Trips, assets, wallets, geomapping and deep delivery insights from intelligent parcel to person matching technology.',
    accent: 'from-indigo-500/15 to-brand/5',
  },
  {
    icon: Plane,
    title: 'Air + Ground + Maritime',
    text: 'Whether your own assets or outsourced, deliveries are tracked end to end.',
    accent: 'from-cyan-500/15 to-brand/5',
  },
  {
    icon: Bell,
    title: 'Geofencing & Notifications',
    text: 'Parcels attach to persons, vehicles and drivers, thus maintaining central mission control while sending live status updates to your customers in real time.',
    accent: 'from-violet-500/15 to-brand/5',
  },
]

const platformFeatures = [
  {
    icon: UserCheck,
    title: 'Automated KYC & Self-Service',
    text: 'Automated KYC and self-service profile updates in user friendly customer dashboards.',
  },
  {
    icon: Plug,
    title: 'ERP, CRM & Accounting',
    text: 'Compatible with your ERP, CRM and accounting systems. Integrates or replaces required business functions.',
  },
  {
    icon: Store,
    title: 'E-Commerce API Marketplace',
    text: 'Integrates with bulk e-commerce platforms. Logistics companies with live pre-programmed prices are able to win trips from new customers through our API marketplace.',
  },
]

const supplyChainModes = [
  {
    icon: Plane,
    title: 'Air',
    text: 'Airport ops, aircraft, crew and air cargo fees in one control tower.',
  },
  {
    icon: Ship,
    title: 'Maritime',
    text: 'Ports, vessels and ocean freight visibility alongside inland handoffs.',
  },
  {
    icon: Truck,
    title: 'Road & Rail',
    text: 'Fleet, yards, locomotives and cross-border corridors under live trip control.',
  },
  {
    icon: Warehouse,
    title: 'Warehousing',
    text: 'Receive, label, assign and dispatch — own fleet or 4PL partners.',
  },
]

function LeadCaptureForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await portalService.submitLead({
        name: name.trim(),
        email: email.trim(),
        company: company.trim(),
        message: message.trim(),
      })
      setSubmitted(true)
      setName('')
      setEmail('')
      setCompany('')
      setMessage('')
    } catch (err) {
      setError(err.message || 'Could not submit your request')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl rounded-[1.75rem] border border-brand/15 bg-brand-light/40 p-8 text-center shadow-[var(--shadow-card)]">
        <p className="text-lg font-extrabold text-ink">Thanks — we received your details.</p>
        <p className="mt-2 text-sm text-muted">Our team will follow up shortly.</p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-5 text-sm font-semibold text-brand hover:underline"
        >
          Send another enquiry
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid max-w-xl gap-4 rounded-[1.75rem] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-ink">Name</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-ink">Work email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-ink">Company</span>
        <input
          type="text"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-ink">How can we help?</span>
        <textarea
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
      {error ? <ErrorState message={error} /> : null}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand/20 transition hover:brightness-105 disabled:opacity-60"
      >
        <Send size={16} />
        {loading ? 'Sending...' : 'Request a demo'}
      </button>
    </form>
  )
}

function FeatureCard({ icon: Icon, title, text, accent }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-line/80 bg-white p-6 shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-lg hover:shadow-brand/10">
      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-brand ring-1 ring-brand/10 transition group-hover:scale-105 group-hover:ring-brand/20`}
      >
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <h3 className="text-base font-extrabold leading-snug text-ink">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{text}</p>
    </article>
  )
}

function PlatformCard({ icon: Icon, title, text }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition duration-300 hover:bg-white/10">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/20 text-brand-soft ring-1 ring-white/10">
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <h3 className="text-base font-extrabold text-white">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">{text}</p>
    </article>
  )
}

export default function HomePage() {
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
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-3">
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

      <main>
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-24 lg:pt-16">
          <div className="max-w-xl lg:max-w-none">
            <p className="inline-flex items-center rounded-full border border-brand/15 bg-brand-light/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand">
              Cloud Ship 100
            </p>
            <h1 className="mt-5 text-[2rem] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.35rem]">
              <span className="block">The World&apos;s Most Integrated</span>
              <span className="mt-1 block bg-gradient-to-r from-brand via-brand-soft to-brand-dark bg-clip-text text-transparent">
                Transport Management System
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
              Logistics enterprise software for companies that can&apos;t afford system downtime.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:brightness-105 hover:shadow-xl hover:shadow-brand/25"
              >
                Try Demo
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login?role=customer"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 text-sm font-bold text-ink shadow-sm transition hover:border-brand/40 hover:bg-brand-light/40"
              >
                Customer Portal
              </Link>
              <Link
                to="/login?role=driver"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 text-sm font-bold text-ink shadow-sm transition hover:border-brand/40 hover:bg-brand-light/40"
              >
                Driver Portal
              </Link>
            </div>

            <ul className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
              {trustBadges.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm text-muted">
                  <Icon size={15} className="shrink-0 text-brand" strokeWidth={2.25} />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative lg:justify-self-end">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-brand/10 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 shadow-2xl shadow-brand/10 ring-1 ring-line/50 backdrop-blur">
              <div className="flex items-center gap-2 border-b border-line/70 bg-slate-50/90 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/90" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                <p className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Operations Command Center
                </p>
              </div>

              <div className="grid gap-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-brand-gradient p-4 text-white shadow-md shadow-brand/20">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                      Total Revenue
                    </p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight">$24,580</p>
                    <p className="mt-1 text-xs text-emerald-200">+12% from last month</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Deliveries
                    </p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">1,245</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-600">+8% growth</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-gradient-to-b from-brand-light/60 to-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold text-muted">Live activity</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Live
                    </span>
                  </div>
                  <svg viewBox="0 0 320 80" className="h-20 w-full" aria-hidden>
                    <defs>
                      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#007BFF" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#007BFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 60 C40 50, 60 20, 100 35 S160 70, 200 40 S260 10, 320 25 L320 80 L0 80 Z"
                      fill="url(#chartFill)"
                    />
                    <path
                      d="M0 60 C40 50, 60 20, 100 35 S160 70, 200 40 S260 10, 320 25"
                      fill="none"
                      stroke="#007BFF"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0 70 C50 65, 80 40, 120 50 S180 75, 220 55 S280 30, 320 45"
                      fill="none"
                      stroke="#4DA3FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="rounded-2xl border border-line bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        Road Cargo
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        Southern Africa corridor · live vehicle clusters
                      </p>
                    </div>
                    <span className="rounded-lg bg-brand-light px-2 py-1 text-[10px] font-bold text-brand">
                      MAP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line/70 bg-surface py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-brand">
                Live Pricing
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Get an instant quote
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                Real distance-based pricing, calculated live — no sales call required.
              </p>
            </div>
            <LivePricingWidget />
          </div>
        </section>

        <section className="border-t border-line/70 bg-white py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-brand">
                Core Platform
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                One system for every mode of transport
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                Mission control for operators who need live visibility across fleets, trips, and
                customer deliveries — without switching tools.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line/70 bg-surface py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-brand">
                Full 4PL Supply Chain
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Control every stage of the value chain
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                One platform spanning air, maritime, road and rail, and warehousing — own assets or
                outsourced partners.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {supplyChainModes.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="flex h-full flex-col rounded-2xl border border-line/80 bg-white p-6 shadow-[var(--shadow-card)]"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand ring-1 ring-brand/10">
                    <Icon size={20} strokeWidth={2.25} />
                  </div>
                  <h3 className="text-base font-extrabold text-ink">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-line/70 bg-ink py-20 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,#007bff33,transparent_42%),radial-gradient(circle_at_85%_80%,#4da3ff22,transparent_40%)]"
          />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-brand-soft">
                Platform Capabilities
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Enterprise-ready from day one
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                Compliance, integrations, and customer self-service built into the same platform
                your operations team runs on.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {platformFeatures.map((feature) => (
                <PlatformCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line/70 bg-white py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-brand">
                Leads
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Talk to our logistics team
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                Tell us about your network and we will follow up with a tailored Cloud Ship walkthrough.
              </p>
            </div>
            <LeadCaptureForm />
          </div>
        </section>

        <section className="border-t border-line/70 bg-brand-soft-gradient py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 text-center sm:px-6">
            <h2 className="max-w-xl text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              See Cloud Ship in action
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-muted sm:text-base">
              Explore the operator ERP demo, customer portal, or driver portal — no setup required.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:brightness-105"
              >
                Try Demo
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login?role=customer"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 text-sm font-bold text-ink transition hover:border-brand/40"
              >
                Customer Portal
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:px-6 sm:text-left">
          <Logo size="sm" />
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
