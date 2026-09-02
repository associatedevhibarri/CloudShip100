import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'

export default function RailPage() {
  return (
    <div>
      <PageHeader title="Rail" subtitle="Sidings, locomotives, and rail yards." />
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 font-extrabold">Rail Sidings</h3>
          <DataTable
            columns={[
              { key: 'name', label: 'Siding' },
              { key: 'location', label: 'Location' },
              { key: 'tracks', label: 'Tracks' },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={api.getRailSidings()}
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
            rows={api.getLocomotives()}
          />
        </section>
        <section>
          <h3 className="mb-2 font-extrabold">Yards</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {api.getRailYards().map((y) => (
              <Card key={y.id} className="p-4">
                <p className="font-extrabold">{y.name}</p>
                <p className="text-sm text-muted">{y.location}</p>
                <p className="mt-2 text-sm font-semibold">Capacity: {y.capacity}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
