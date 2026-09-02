import { Link } from 'react-router-dom'
import { Truck, Plane, Ship, TrainFront, Warehouse, Forklift } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { api } from '../../services/api'

const links = [
  { to: '/app/assets/yards', title: 'Yards & Depots', desc: 'Capacity, truck & container slots', icon: Warehouse },
  { to: '/app/assets/vehicles', title: 'Vehicles', desc: 'Docs, compliance, body types', icon: Truck },
  { to: '/app/assets/trailers', title: 'Trailers', desc: 'Tankers, flatbeds, reefers', icon: Truck },
  { to: '/app/assets/equipment', title: 'Road Equipment', desc: 'Forklifts, cranes, conveyors', icon: Forklift },
  { to: '/app/assets/rail', title: 'Rail', desc: 'Sidings, locomotives, yards', icon: TrainFront },
  { to: '/app/assets/maritime', title: 'Maritime', desc: 'Ports and berths', icon: Ship },
  { to: '/app/assets/air/airports', title: 'Airports', desc: 'Hangars & pilot check-in', icon: Plane },
  { to: '/app/assets/air/aeroplanes', title: 'Aeroplanes', desc: 'Cargo & passenger fleet', icon: Plane },
]

export default function AssetsOverviewPage() {
  const vehicles = api.getVehicles().length
  const planes = api.getAeroplanes().length
  const yards = api.getYards().length
  const ports = api.getPorts().length

  return (
    <div>
      <PageHeader title="Assets" subtitle="Road, rail, maritime, and air asset categories." />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          ['Yards', yards],
          ['Vehicles', vehicles],
          ['Aircraft', planes],
          ['Ports', ports],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-semibold uppercase text-muted">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
    </div>
  )
}
