import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'

export default function GeomappingPage() {
  const geofences = api.getGeofences()
  return (
    <div>
      <PageHeader
        title="Geomapping"
        subtitle="Coverage by country, province/state, radius, and exclusions."
        actions={
          <Link to="/app/warehouse/zones" className="text-sm font-bold text-brand hover:underline">
            Yard geofences & zones →
          </Link>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {['country', 'province', 'radius'].map((scope) => (
          <Card key={scope} className="p-4">
            <p className="text-xs uppercase capitalize text-muted">{scope} rules</p>
            <p className="text-2xl font-extrabold">
              {geofences.filter((g) => g.scope === scope).length}
            </p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Exceptions</p>
          <p className="text-2xl font-extrabold">
            {geofences.reduce((s, g) => s + g.exclusions.length, 0)}
          </p>
        </Card>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Rule' },
          { key: 'scope', label: 'Scope' },
          { key: 'region', label: 'Region' },
          {
            key: 'radiusKm',
            label: 'Radius',
            render: (r) => (r.radiusKm ? `${r.radiusKm} km` : '—'),
          },
          { key: 'rule', label: 'Policy' },
          {
            key: 'exclusions',
            label: 'Exclusions',
            render: (r) => (r.exclusions.length ? r.exclusions.join(', ') : 'None'),
          },
        ]}
        rows={geofences}
      />
    </div>
  )
}
