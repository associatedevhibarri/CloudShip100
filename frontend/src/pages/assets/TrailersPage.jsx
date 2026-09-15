import { api } from '../../services/api'
import { DEMO_REASONS, PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'

export default function TrailersPage() {
  const trailers = api.getTrailers()
  return (
    <div>
      <PageHeader demo={DEMO_REASONS.fleet} title="Trailers" subtitle="Tankers, flatbeds, reefers, and curtainsiders." />
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'type', label: 'Type' },
          { key: 'capacity', label: 'Capacity' },
          { key: 'yard', label: 'Yard' },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rows={trailers}
      />
    </div>
  )
}
