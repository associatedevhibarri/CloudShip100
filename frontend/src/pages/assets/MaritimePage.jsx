import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LogisticsMap } from '../../components/map/LogisticsMap'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function MaritimePage() {
  const { rows: ports, loading, error, reload } = useLiveList(() => api.getPorts(), 'port')
  const mapAssets = ports.map((p) => ({
    id: p.id,
    type: 'ship',
    label: p.name,
    status: 'dispatched',
    lat: p.lat,
    lng: p.lng,
  }))

  if (loading) return <LoadingState label="Loading ports..." />

  return (
    <div>
      <PageHeader title="Maritime" subtitle="Ports across the Southern African corridor." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title="Add port"
        fields={[
          { name: 'name', label: 'Port' },
          { name: 'country', label: 'Country' },
          { name: 'berths', label: 'Berths', type: 'number' },
          { name: 'status', label: 'Status', placeholder: 'Operational' },
          { name: 'lat', label: 'Latitude', type: 'number', required: false },
          { name: 'lng', label: 'Longitude', type: 'number', required: false },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ type: 'port', ...body })
          reload()
        }}
      />
      {ports.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No ports yet. Use the form above to add one.</Card>
      ) : (
        <>
          <div className="mb-4">
            <LogisticsMap assets={mapAssets} height="320px" center={[-30, 28]} zoom={4} showLegend={false} />
          </div>
          <DataTable
            columns={[
              { key: 'name', label: 'Port' },
              { key: 'country', label: 'Country' },
              { key: 'berths', label: 'Berths' },
              {
                key: 'status',
                label: 'Status',
                render: (r) => <StatusBadge status={r.status === 'Operational' ? 'Active' : r.status} />,
              },
            ]}
            rows={ports}
          />
        </>
      )}
    </div>
  )
}
