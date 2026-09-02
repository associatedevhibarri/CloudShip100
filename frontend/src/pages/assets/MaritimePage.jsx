import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LogisticsMap } from '../../components/map/LogisticsMap'

export default function MaritimePage() {
  const ports = api.getPorts()
  const mapAssets = ports.map((p) => ({
    id: p.id,
    type: 'ship',
    label: p.name,
    status: 'dispatched',
    lat: p.lat,
    lng: p.lng,
  }))

  return (
    <div>
      <PageHeader title="Maritime" subtitle="Ports across the Southern African corridor." />
      <div className="mb-4">
        <LogisticsMap assets={mapAssets} height="320px" center={[-30, 28]} zoom={4} showLegend={false} />
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Port' },
          { key: 'country', label: 'Country' },
          { key: 'berths', label: 'Berths' },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status === 'Operational' ? 'Active' : r.status} /> },
        ]}
        rows={ports}
      />
    </div>
  )
}
