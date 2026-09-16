import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function AirportsPage() {
  const airports = useLiveList(() => api.getAirports(), 'airport')
  const checkIns = useLiveList(() => api.getPilotCheckIns(), 'pilot_check_in')
  const loading = airports.loading || checkIns.loading
  const error = airports.error || checkIns.error

  if (loading) return <LoadingState label="Loading airports..." />

  return (
    <div>
      <PageHeader title="Airports" subtitle="Airport locations, hangars, and pilot check-in." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title="Add airport"
        fields={[
          { name: 'name', label: 'Airport' },
          { name: 'code', label: 'Code', placeholder: 'JNB' },
          { name: 'location', label: 'Location' },
          { name: 'hangars', label: 'Hangars', type: 'number', required: false },
          { name: 'hangarSlots', label: 'Hangar slots', type: 'number', required: false },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ type: 'airport', ...body })
          airports.reload()
        }}
      />
      {airports.rows.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No airports yet. Use the form above to add one.</Card>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Airport Name' },
            { key: 'code', label: 'Code' },
            { key: 'location', label: 'Location' },
            { key: 'hangars', label: 'Hangars' },
            { key: 'hangarSlots', label: 'Hangar Slots' },
          ]}
          rows={airports.rows}
        />
      )}
      <Card className="mt-4 p-5">
        <h3 className="mb-3 font-extrabold">Pilot Check In / Check Out</h3>
        <AddRecordForm
          title="Add pilot check-in"
          fields={[
            { name: 'pilot', label: 'Pilot' },
            { name: 'airport', label: 'Airport' },
            { name: 'type', label: 'Type', placeholder: 'check_in / check_out' },
            { name: 'at', label: 'Time', inputType: 'datetime-local' },
          ]}
          onSubmit={async (body) => {
            await api.createFleetAsset({
              ...body,
              type: 'pilot_check_in',
              name: body.pilot,
              fields: { type: body.type },
              at: body.at ? new Date(body.at).toISOString() : new Date().toISOString(),
            })
            checkIns.reload()
          }}
        />
        {checkIns.rows.length === 0 ? (
          <p className="text-sm text-muted">No pilot check-ins yet.</p>
        ) : (
          <DataTable
            columns={[
              { key: 'pilot', label: 'Pilot' },
              { key: 'airport', label: 'Airport' },
              { key: 'type', label: 'Type' },
              { key: 'at', label: 'Time', render: (r) => (r.at ? new Date(r.at).toLocaleString() : '—') },
            ]}
            rows={checkIns.rows}
          />
        )}
      </Card>
    </div>
  )
}
