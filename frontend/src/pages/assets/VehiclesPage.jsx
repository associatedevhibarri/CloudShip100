import { useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'

export default function VehiclesPage() {
  const vehicles = api.getVehicles()
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
      render: (row) => <StatusBadge status={row.compliance} />,
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

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Registration, permits, insurance, and roadworthiness."
      />
      <DataTable columns={columns} rows={vehicles} />
      {selected ? (
        <Card className="mt-4 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-extrabold">
              {selected.numberplate} — Documents & Certifications
            </h3>
            <button type="button" className="text-sm text-muted" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p className="mb-3 text-sm text-muted">{selected.inspections}</p>
          <ul className="grid gap-2 sm:grid-cols-3">
            {selected.documents.map((doc) => (
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
