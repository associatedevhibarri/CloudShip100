import { Link } from 'react-router-dom'
import { Boxes, Inbox, ScanLine, GitMerge, MapPinned, Truck, Route, Users } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

const links = [
  {
    to: '/app/warehouse/receiving',
    title: 'Receive orders',
    desc: 'Confirm customer bookings at the dock',
    icon: Inbox,
  },
  {
    to: '/app/warehouse/labelling',
    title: 'Labelling & Batching',
    desc: 'Scan, print labels, close outbound batches',
    icon: ScanLine,
  },
  {
    to: '/app/warehouse/assignment',
    title: 'Smart Assignment',
    desc: 'Parcel → truck → driver → client, own fleet or 4PL',
    icon: GitMerge,
  },
  {
    to: '/app/warehouse/zones',
    title: 'Trip Geofencing & Zones',
    desc: 'Dock, staging, dispatch, and delivery radii',
    icon: MapPinned,
  },
  {
    to: '/app/warehouse/dispatch',
    title: 'Dispatch & Tracking',
    desc: 'Yard exit to destination with live events',
    icon: Truck,
  },
  {
    to: '/app/warehouse/routes',
    title: 'Route Optimisation',
    desc: 'Auto-suggest stops and hours vs baseline',
    icon: Route,
  },
  {
    to: '/app/warehouse/drivers',
    title: 'Driver Management',
    desc: 'Own crew, portal drivers, and subcontracted partners',
    icon: Users,
  },
]

export default function WarehouseOverviewPage() {
  const { data, loading, error } = useWarehouse()
  const kpis = data?.kpis
  const rice =
    data?.parcels?.find((p) => p.id === 'PCL-1001') ||
    data?.parcels?.find((p) => p.status === 'assigned' || p.status === 'dispatched') ||
    data?.parcels?.[0]

  return (
    <div>
      <PageHeader
        title="Warehouse"
        subtitle="Yard operations for 4PL — own fleet and outsourced partners in one board."
      />
      <WarehouseGate loading={loading} error={error}>
        {kpis ? (
          <>
            {(kpis.awaitingReceive || 0) > 0 ? (
              <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                {kpis.awaitingReceive} order{kpis.awaitingReceive === 1 ? '' : 's'} waiting at the dock.{' '}
                <Link to="/app/warehouse/receiving" className="underline">
                  Receive now
                </Link>
              </p>
            ) : null}
            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['Awaiting receive', kpis.awaitingReceive ?? 0],
                ['Inbound today', kpis.inboundToday],
                ['Labelled', kpis.labelled],
                ['Awaiting assign', kpis.awaitingAssign],
                ['Dispatched', kpis.dispatched],
              ].map(([label, value]) => (
                <Card key={label} className="p-4">
                  <p className="text-xs font-semibold uppercase text-muted">{label}</p>
                  <p className="mt-1 text-2xl font-extrabold">{value}</p>
                </Card>
              ))}
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <Card className="border-brand/20 bg-brand-soft-gradient p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Live yard story</p>
                <h3 className="mt-1 text-lg font-extrabold text-ink">
                  {rice?.id || 'No parcels'} · {rice?.cargo || 'Awaiting inbound'}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {rice?.shipper || 'Shipper'} → {rice?.consignee || 'Consignee'}. Status {rice?.status || 'expected'} at{' '}
                  {rice?.warehouse || 'the yard'}
                  {rice?.zone ? ` · ${rice.zone}` : ''}.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  {rice?.labelCode ? (
                    <span className="rounded-full bg-white px-3 py-1 text-ink">{rice.labelCode}</span>
                  ) : null}
                  {rice?.batchId ? (
                    <span className="rounded-full bg-white px-3 py-1 text-ink">{rice.batchId}</span>
                  ) : null}
                  <span className="rounded-full bg-white px-3 py-1 text-ink">
                    {rice?.truck || 'No truck'} · {rice?.driver || 'Unassigned'}
                  </span>
                </div>
                <Link
                  to="/app/warehouse/dispatch"
                  className="mt-4 inline-flex text-sm font-bold text-brand hover:underline"
                >
                  Open dispatch timeline →
                </Link>
              </Card>
              <Card className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Boxes size={18} className="text-brand" />
                  <h3 className="font-extrabold">Capacity mix</h3>
                </div>
                <p className="text-sm text-muted">
                  Logistics companies outsource what they do not own. Assignment always picks own fleet or
                  a 4PL partner.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs font-semibold uppercase text-emerald-700">Own fleet</p>
                    <p className="mt-1 text-2xl font-extrabold text-emerald-800">{kpis.ownFleetShare}%</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase text-amber-800">Subcontractor</p>
                    <p className="mt-1 text-2xl font-extrabold text-amber-900">{kpis.partnerShare}%</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {links.map(({ to, title, desc, icon: Icon }) => (
                <Link key={to} to={to}>
                  <Card className="h-full p-5 transition hover:border-brand hover:shadow-md">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
                      <Icon size={20} />
                    </div>
                    <h3 className="font-extrabold text-ink">{title}</h3>
                    <p className="mt-1 text-sm text-muted">{desc}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </WarehouseGate>
    </div>
  )
}
