import { useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function VehiclesPage() {
  const { rows: vehicles, loading, error, reload } = useLiveList(() => api.getVehicles(), 'vehicle')
  const [selected, setSelected] = useState(null)

  const columns = [
    { key: 'name', label: 'Vehicle' },
    { key: 'yard', label: 'Yard Location' },
    { key: 'numberplate', label: 'Numberplate' },
    { key: 'payloadTons', label: 'Payload (t)' },
    { key: 'axleCount', label: 'Axles' },
    { key: 'bodyType', label: 'Body Type' },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <span>
          {row.category}
          <span className="block text-xs text-muted">{row.subcategory}</span>
        </span>
      ),
    },
    {
      key: 'compliance',
      label: 'Compliance',
      render: (row) => (row.compliance ? <StatusBadge status={row.compliance} /> : '—'),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button type="button" className="font-semibold text-brand" onClick={() => setSelected(row)}>
          Docs
        </button>
      ),
    },
  ]

  if (loading) return <LoadingState label="Loading vehicles..." />

  return (
    <div>
      <PageHeader title="Vehicles" subtitle="Registration, permits, insurance, and roadworthiness." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title="Add vehicle"
        fields={[
          { name: 'name', label: 'Vehicle' },
          { name: 'numberplate', label: 'Numberplate' },
          { name: 'yard', label: 'Yard' },
          { name: 'payloadTons', label: 'Payload (t)', type: 'number' },
          { name: 'axleCount', label: 'Axles', type: 'number' },
          { name: 'bodyType', label: 'Body type' },
          { name: 'category', label: 'Category', required: false },
          { name: 'compliance', label: 'Compliance', placeholder: 'compliant', required: false },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ type: 'vehicle', ...body })
          reload()
        }}
      />
      {vehicles.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No vehicles yet. Use the form above to add one.</Card>
      ) : (
        <DataTable columns={columns} rows={vehicles} />
      )}
      {selected ? (
        <Card className="mt-4 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-extrabold">
              {selected.numberplate || selected.name} — Documents & Certifications
            </h3>
            <button type="button" className="text-sm text-muted" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p className="mb-3 text-sm text-muted">{selected.inspections || 'No inspection notes.'}</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {(selected.documents || []).map((doc) => (
              <li key={doc.name} className="rounded-xl border border-line p-3">
                <p className="font-bold">{doc.name}</p>
                <p className="text-xs text-muted">Expiry {doc.expiry}</p>
                <div className="mt-2">
                  <StatusBadge status={doc.status === 'valid' ? 'compliant' : 'expiring'} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}
