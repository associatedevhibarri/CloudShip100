import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { LogisticsMap } from '../../components/map/LogisticsMap'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

export default function WarehouseZonesPage() {
  const { data, loading, error } = useWarehouse()
  const zones = data?.zones || []
  const mapAssets = data?.mapAssets || []

  return (
    <div>
      <PageHeader
        title="Trip Geofencing & Zones"
        subtitle="Dock, staging, dispatch bay, customer site, and corridor rules. Exit from dispatch starts tracking."
      />
      <WarehouseGate loading={loading} error={error}>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {['dock', 'staging', 'dispatch', 'delivery'].map((type) => (
          <Card key={type} className="p-4">
            <p className="text-xs font-semibold uppercase capitalize text-muted">{type}</p>
            <p className="mt-1 text-2xl font-extrabold">{zones.filter((z) => z.type === type).length}</p>
          </Card>
        ))}
      </div>

      <div className="mb-6">
        <LogisticsMap assets={mapAssets} height="420px" center={[-28.2, 29.4]} zoom={6} />
      </div>

      <DataTable
        columns={[
          { key: 'name', label: 'Zone' },
          { key: 'warehouse', label: 'Site' },
          { key: 'type', label: 'Type' },
          {
            key: 'radiusM',
            label: 'Radius',
            render: (r) => (r.radiusM ? `${r.radiusM >= 1000 ? `${r.radiusM / 1000} km` : `${r.radiusM} m`}` : 'Corridor'),
          },
          { key: 'rule', label: 'Rule' },
          {
            key: 'active',
            label: 'Active',
            render: (r) => (r.active ? 'Yes' : 'No'),
          },
        ]}
        rows={zones}
      />
      </WarehouseGate>
    </div>
  )
}
