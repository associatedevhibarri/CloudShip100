import { api } from '../../services/api'
import { DEMO_REASONS, PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'

export default function AirEquipmentPage() {
  return (
    <div>
      <PageHeader demo={DEMO_REASONS.fleet} title="Air Equipment / Assets" subtitle="Forklifts, cranes, generators on apron." />
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
