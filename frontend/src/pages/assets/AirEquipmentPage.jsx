import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function AirEquipmentPage() {
  const { rows, loading, error, reload } = useLiveList(() => api.getAirEquipment(), 'air_equipment')
  if (loading) return <LoadingState label="Loading air equipment..." />
  return (
    <div>
      <PageHeader title="Air Equipment / Assets" subtitle="Forklifts, cranes, generators on apron." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title="Add air equipment"
        fields={[
          { name: 'name', label: 'Equipment' },
          { name: 'location', label: 'Location' },
          { name: 'status', label: 'Status', placeholder: 'available' },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ type: 'air_equipment', ...body })
          reload()
        }}
      />
      {rows.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No air equipment yet. Use the form above to add one.</Card>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Equipment' },
            { key: 'location', label: 'Location' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={rows}
        />
      )}
    </div>
  )
}
