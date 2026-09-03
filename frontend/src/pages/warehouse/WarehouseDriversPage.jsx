import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

export default function WarehouseDriversPage() {
  const { data, loading, error } = useWarehouse()
  const drivers = data?.drivers || []
  const [fleet, setFleet] = useState('all')

  const visible = useMemo(
    () => (fleet === 'all' ? drivers : drivers.filter((d) => d.fleetType === fleet)),
    [drivers, fleet],
  )

  return (
    <div>
      <PageHeader
        title="Driver Management"
        subtitle="Portal drivers and 4PL partner crews on the dock, loading, or on route."
        actions={
          <Link to="/app/drivers" className="text-sm font-bold text-brand hover:underline">
            Full driver profiles →
          </Link>
        }
      />
      <WarehouseGate loading={loading} error={error}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Available</p>
          <p className="mt-1 text-2xl font-extrabold">
            {drivers.filter((d) => d.status === 'available').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Loading / dock</p>
          <p className="mt-1 text-2xl font-extrabold">
            {drivers.filter((d) => d.status === 'loading').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">On route</p>
          <p className="mt-1 text-2xl font-extrabold">
            {drivers.filter((d) => d.status === 'on_route').length}
          </p>
        </Card>
      </div>

      <FilterBar>
        <FilterButton active={fleet === 'all'} onClick={() => setFleet('all')}>
          All crews
        </FilterButton>
        <FilterButton active={fleet === 'own'} onClick={() => setFleet('own')}>
          Own fleet
        </FilterButton>
        <FilterButton active={fleet === 'subcontractor'} onClick={() => setFleet('subcontractor')}>
          4PL partners
        </FilterButton>
      </FilterBar>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((d) => (
          <Card key={d.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold">{d.name}</h3>
                <p className="text-sm text-muted">{d.partner}</p>
                {d.employeeId ? <p className="mt-1 text-xs font-semibold text-brand">{d.employeeId}</p> : null}
              </div>
              <StatusBadge status={d.status} />
            </div>
                {d.source === 'portal' ? (
                  <p className="mt-2 text-xs font-semibold text-brand">{d.employeeId}</p>
                ) : null}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Yard</dt>
                <dd className="font-semibold">{d.yard}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Vehicle</dt>
                <dd className="font-semibold">{d.vehicle}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Shift</dt>
                <dd className="font-semibold">{d.shift}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Parcels</dt>
                <dd className="font-semibold">
                  {d.assignedParcels?.length ? d.assignedParcels.join(', ') : 'None'}
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
      </WarehouseGate>
    </div>
  )
}
