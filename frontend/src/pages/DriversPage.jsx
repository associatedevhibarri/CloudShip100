import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { WarehouseGate, useWarehouse } from '../hooks/useWarehouse'

export default function DriversPage() {
  const drivers = api.getDrivers()
  const shifts = api.getDriverShifts()
  const { data, loading, error } = useWarehouse()
  const liveDrivers = data?.registeredDrivers || []

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Licences, training, shifts, performance, and GPS-ready profiles."
        actions={
          <Link to="/app/warehouse/drivers" className="text-sm font-bold text-brand hover:underline">
            Warehouse driver board →
          </Link>
        }
      />

      <WarehouseGate loading={loading} error={error}>
        {liveDrivers.length ? (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-muted">Portal drivers</h3>
            <div className="mb-2 grid gap-3 md:grid-cols-3">
              {liveDrivers.map((d) => (
                <Card key={d.employeeId} className="p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-brand">{d.employeeId}</p>
                  <p className="mt-1 font-extrabold">{d.name}</p>
                  <p className="text-xs text-muted">{d.email}</p>
                  <p className="mt-2 text-sm font-semibold">{d.vehicle || 'No vehicle yet'}</p>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <p className="mb-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
            Register a driver at /login?role=driver, then assign parcels from Warehouse → Smart Assignment.
          </p>
        )}
      </WarehouseGate>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {drivers.map((driver) => (
          <Card key={driver.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold">{driver.name}</h3>
                <p className="text-sm text-muted">{driver.phone}</p>
              </div>
              <StatusBadge status={driver.status === 'Available' ? 'Available' : 'in_progress'} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">License</dt>
                <dd className="font-semibold">{driver.license}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Expiry</dt>
                <dd className="font-semibold">{driver.licenceExpiry}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">On-time rate</dt>
                <dd className="font-semibold">{driver.onTimeRate}%</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Fuel L/100km</dt>
                <dd className="font-semibold">{driver.fuelEfficiency}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Behavior</dt>
                <dd className="font-semibold">{driver.behaviorScore}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Shift</dt>
                <dd className="font-semibold">{driver.shift}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">Training: {driver.training.join(', ')}</p>
            <p className="mt-1 text-xs text-muted">Restrictions: {driver.restrictions}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-lg font-extrabold">Shift management</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {shifts.map((day) => (
            <div key={day.day} className="rounded-xl border border-line bg-surface/60 p-3">
              <p className="mb-2 text-sm font-extrabold text-brand">{day.day}</p>
              <ul className="space-y-1 text-xs text-ink">
                {day.slots.map((slot) => (
                  <li key={slot} className="rounded-lg bg-white px-2 py-1.5 shadow-sm">
                    {slot}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
