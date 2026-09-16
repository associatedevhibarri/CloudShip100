import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function YardsPage() {
  const { rows, loading, error, reload } = useLiveList(() => api.getYards(), 'yard')
  const columns = [
    { key: 'name', label: 'Yard Name' },
    { key: 'type', label: 'Type' },
    { key: 'location', label: 'Location' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'truckSlots', label: 'Truck Slots' },
    { key: 'containerSlots', label: 'Container Slots' },
  ]
  if (loading) return <LoadingState label="Loading yards..." />
  return (
    <div>
      <PageHeader title="Yards and Depots" subtitle="Warehouses, yards, depots, and terminals in the fleet registry." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title="Add yard"
        fields={[
          { name: 'name', label: 'Yard name' },
          { name: 'type', label: 'Type', placeholder: 'Yard / Depot / Terminal' },
          { name: 'location', label: 'Location' },
          { name: 'capacity', label: 'Capacity' },
          { name: 'truckSlots', label: 'Truck slots', type: 'number' },
          { name: 'containerSlots', label: 'Container slots', type: 'number' },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ ...body, type: 'yard', fields: { type: body.type } })
          reload()
        }}
      />
      {rows.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No yards yet. Use the form above to add one.</Card>
      ) : (
        <DataTable columns={columns} rows={rows} />
      )}
    </div>
  )
}
