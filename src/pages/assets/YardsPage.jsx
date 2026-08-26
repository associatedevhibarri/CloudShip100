import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'

export default function YardsPage() {
  const yards = api.getYards()
  const columns = [
    { key: 'name', label: 'Yard Name' },
    { key: 'type', label: 'Type' },
    { key: 'location', label: 'Location' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'truckSlots', label: 'Truck Slots' },
    { key: 'containerSlots', label: 'Container Slots' },
  ]
  return (
    <div>
      <PageHeader title="Yards and Depots" subtitle="Warehouses, yards, depots, and terminals." />
      <DataTable columns={columns} rows={yards} />
    </div>
  )
}
