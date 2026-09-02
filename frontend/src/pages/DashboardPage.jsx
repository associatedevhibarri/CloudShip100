import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { Users, Truck, Gauge, Wallet } from 'lucide-react'
import { api } from '../services/api'
import { StatCard } from '../components/ui/StatCard'
import { Card } from '../components/ui/Card'
import { LogisticsMap } from '../components/map/LogisticsMap'
import { Logo } from '../components/Logo'

export default function DashboardPage() {
  const kpis = api.getKpis()
  const activity = api.getActivity()
  const lost = api.getLostBookings()
  const mapAssets = api.getMapAssets()

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-[var(--radius-card)] border border-brand/10 bg-brand-soft-gradient px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-5 sm:gap-6">
            <Logo size="xl" className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-brand">
                Cloud Ship Ops
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted">
                Live logistics command center across road, air, and maritime.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-brand-gradient px-4 py-3 text-white shadow-md shadow-brand/20">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/75">Period</p>
            <p className="text-sm font-extrabold">This Month</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={kpis.totalRevenue.value}
          change={kpis.totalRevenue.change}
          label={kpis.totalRevenue.label}
          prefix="$"
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          title="Deliveries"
          value={kpis.deliveries.value}
          change={kpis.deliveries.change}
          label={kpis.deliveries.label}
          icon={Truck}
        />
        <StatCard
          title="New Customers"
          value={kpis.newCustomers.value}
          change={kpis.newCustomers.change}
          label={kpis.newCustomers.label}
          icon={Users}
        />
        <StatCard
          title="Traffic"
          value={kpis.traffic.value}
          change={kpis.traffic.change}
          label={kpis.traffic.label}
          suffix="%"
          icon={Gauge}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Activity</h2>
            <span className="text-xs font-semibold text-muted">Jan — Jul</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity}>
                <defs>
                  <linearGradient id="roadFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007BFF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#007BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="road" stroke="#007BFF" fill="url(#roadFill)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="air" stroke="#4DA3FF" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="maritime" stroke="#94A3B8" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Lost Bookings</h2>
            <Link to="/app/orders" className="text-sm font-semibold text-brand">
              View Details
            </Link>
          </div>
          <div className="relative mx-auto h-56 w-full max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={lost.items}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {lost.items.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-extrabold">{lost.total}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Total</p>
              </div>
            </div>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {lost.items.slice(0, 4).map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold">{item.value}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_0.7fr]">
        <div className="relative">
          <LogisticsMap assets={mapAssets} height="360px" />
          <p className="pointer-events-none absolute bottom-5 left-1/2 z-[500] -translate-x-1/2 text-sm font-extrabold tracking-wide text-ink drop-shadow">
            Road Cargo
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Link to="/app/assets/air/aeroplanes">
            <Card tone="brand" className="flex h-full min-h-[160px] flex-col justify-between bg-brand-gradient p-5 transition hover:brightness-105">
              <h3 className="text-xl font-extrabold">Air Cargo</h3>
              <div className="mx-auto my-3 flex h-24 w-24 items-center justify-center rounded-full bg-white/15">
                <svg viewBox="0 0 80 80" className="h-16 w-16 text-white">
                  <circle cx="40" cy="40" r="22" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                  <path d="M12 44 L50 36 L68 28 L54 40 L58 52 Z" fill="currentColor" />
                </svg>
              </div>
              <p className="text-sm text-white/85">Freighters, hangars & crew schedules</p>
            </Card>
          </Link>
          <Link to="/app/assets/maritime">
            <Card className="flex h-full min-h-[160px] flex-col justify-between p-5 transition hover:border-brand">
              <h3 className="text-xl font-extrabold text-ink">Maritime Cargo</h3>
              <div className="relative mx-auto my-4 h-20 w-36 rounded-xl bg-brand-light">
                <span className="absolute left-4 top-5 h-2.5 w-2.5 rounded-full bg-brand" />
                <span className="absolute left-16 top-8 h-2.5 w-2.5 rounded-full bg-brand" />
                <span className="absolute right-6 top-4 h-2.5 w-2.5 rounded-full bg-brand-soft" />
                <span className="absolute bottom-4 left-10 h-2.5 w-2.5 rounded-full bg-brand-dark" />
              </div>
              <p className="text-sm text-muted">Ports, berths & ocean lane visibility</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
