import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function CheckInPage() {
  const { rows, loading, error, reload } = useLiveList(() => api.getCheckIns(), 'check_in')
  if (loading) return <LoadingState label="Loading check-ins..." />
  return (
    <div>
      <PageHeader title="Driver Check In / Check Out" subtitle="Yard gate activity log." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title="Add check-in"
        fields={[
          { name: 'driver', label: 'Driver' },
          { name: 'yard', label: 'Yard' },
          { name: 'type', label: 'Type', placeholder: 'check_in / check_out' },
          { name: 'at', label: 'Time', inputType: 'datetime-local' },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({
            ...body,
            type: 'check_in',
            name: body.driver,
            fields: { type: body.type },
            at: body.at ? new Date(body.at).toISOString() : new Date().toISOString(),
          })
          reload()
        }}
      />
      {rows.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No check-in records yet. Use the form above to add one.</Card>
      ) : (
        <DataTable
          columns={[
            { key: 'driver', label: 'Driver' },
            { key: 'yard', label: 'Yard' },
            { key: 'type', label: 'Type' },
            {
              key: 'at',
              label: 'Timestamp',
              render: (r) => (r.at ? new Date(r.at).toLocaleString() : '—'),
            },
          ]}
          rows={rows}
        />
      )}
    </div>
  )
}
