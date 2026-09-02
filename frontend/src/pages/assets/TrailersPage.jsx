import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'

export default function TrailersPage() {
  const trailers = api.getTrailers()
  return (
    <div>
      <PageHeader title="Trailers" subtitle="Tankers, flatbeds, reefers, and curtainsiders." />
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
