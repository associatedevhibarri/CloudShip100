import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function TrailersPage() {
  const { rows, loading, error, reload } = useLiveList(() => api.getTrailers(), 'trailer')
  if (loading) return <LoadingState label="Loading trailers..." />
  return (
    <div>
      <PageHeader title="Trailers" subtitle="Tankers, flatbeds, reefers, and curtainsiders." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title="Add trailer"
        fields={[
          { name: 'name', label: 'Name / ID' },
          { name: 'type', label: 'Type', placeholder: 'Tanker / Flatbed / Reefer' },
          { name: 'capacity', label: 'Capacity' },
          { name: 'yard', label: 'Yard' },
          { name: 'status', label: 'Status', placeholder: 'available' },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ ...body, type: 'trailer', fields: { type: body.type } })
          reload()
        }}
      />
      {rows.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No trailers yet. Use the form above to add one.</Card>
      ) : (
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'type', label: 'Type' },
            { key: 'capacity', label: 'Capacity' },
            { key: 'yard', label: 'Yard' },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={rows}
        />
      )}
    </div>
  )
}
