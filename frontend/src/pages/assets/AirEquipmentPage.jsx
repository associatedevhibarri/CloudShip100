import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'

export default function AirEquipmentPage() {
  return (
    <div>
      <PageHeader title="Air Equipment / Assets" subtitle="Forklifts, cranes, generators on apron." />
      <DataTable
        columns={[
          { key: 'name', label: 'Equipment' },
          { key: 'location', label: 'Location' },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rows={api.getAirEquipment()}
      />
    </div>
  )
}
