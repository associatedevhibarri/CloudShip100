import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function RailPage() {
  const sidings = useLiveList(() => api.getRailSidings(), 'rail_siding')
  const locos = useLiveList(() => api.getLocomotives(), 'locomotive')
  const yards = useLiveList(() => api.getRailYards(), 'rail_yard')
  const loading = sidings.loading || locos.loading || yards.loading
  const error = sidings.error || locos.error || yards.error

  if (loading) return <LoadingState label="Loading rail assets..." />

  const empty = sidings.rows.length === 0 && locos.rows.length === 0 && yards.rows.length === 0

  return (
    <div>
      <PageHeader title="Rail" subtitle="Sidings, locomotives, and rail yards." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <div className="space-y-4">
        <AddRecordForm
          title="Add siding"
          fields={[
            { name: 'name', label: 'Siding' },
            { name: 'location', label: 'Location' },
            { name: 'tracks', label: 'Tracks', type: 'number' },
            { name: 'status', label: 'Status', placeholder: 'active' },
          ]}
          onSubmit={async (body) => {
            await api.createFleetAsset({ type: 'rail_siding', ...body })
            sidings.reload()
          }}
        />
        <AddRecordForm
          title="Add locomotive"
          fields={[
            { name: 'name', label: 'Locomotive' },
            { name: 'yard', label: 'Yard' },
            { name: 'power', label: 'Power' },
            { name: 'status', label: 'Status', placeholder: 'available' },
          ]}
          onSubmit={async (body) => {
            await api.createFleetAsset({ type: 'locomotive', ...body })
            locos.reload()
          }}
        />
        <AddRecordForm
          title="Add rail yard"
          fields={[
            { name: 'name', label: 'Yard' },
            { name: 'location', label: 'Location' },
            { name: 'capacity', label: 'Capacity' },
          ]}
          onSubmit={async (body) => {
            await api.createFleetAsset({ type: 'rail_yard', ...body })
            yards.reload()
          }}
        />
      </div>
      {empty && !error ? (
        <Card className="mt-4 p-8 text-center text-sm text-muted">No rail assets yet. Use the forms above to add them.</Card>
      ) : (
        <div className="mt-6 space-y-6">
          <section>
            <h3 className="mb-2 font-extrabold">Rail Sidings</h3>
            <DataTable
              columns={[
                { key: 'name', label: 'Siding' },
                { key: 'location', label: 'Location' },
                { key: 'tracks', label: 'Tracks' },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={sidings.rows}
            />
          </section>
          <section>
            <h3 className="mb-2 font-extrabold">Locomotives</h3>
            <DataTable
              columns={[
                { key: 'name', label: 'Locomotive' },
                { key: 'yard', label: 'Yard' },
                { key: 'power', label: 'Power' },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={locos.rows}
            />
          </section>
          <section>
            <h3 className="mb-2 font-extrabold">Yards</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {yards.rows.map((y) => (
                <Card key={y.id} className="p-4">
                  <p className="font-extrabold">{y.name}</p>
                  <p className="text-sm text-muted">{y.location}</p>
                  <p className="mt-2 text-sm font-semibold">Capacity: {y.capacity}</p>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
