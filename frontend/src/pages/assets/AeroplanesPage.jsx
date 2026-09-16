import { useMemo, useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function AeroplanesPage() {
  const planes = useLiveList(() => api.getAeroplanes(), 'aeroplane')
  const types = useLiveList(() => api.getAircraftTypes(), 'aircraft_type')
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState(null)

  const filteredTypes = useMemo(
    () => (category === 'all' ? types.rows : types.rows.filter((t) => t.category === category)),
    [types.rows, category],
  )

  if (planes.loading || types.loading) return <LoadingState label="Loading aeroplanes..." />

  const error = planes.error || types.error

  return (
    <div>
      <PageHeader title="Aeroplanes" subtitle="Cargo / passenger fleet, schedules, documents, and compliance." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <AddRecordForm
        title="Add aeroplane"
        fields={[
          { name: 'name', label: 'Aeroplane' },
          { name: 'registration', label: 'Registration' },
          { name: 'airport', label: 'Airport' },
          { name: 'planeType', label: 'Plane type' },
          { name: 'role', label: 'Role', placeholder: 'Cargo / Passenger', required: false },
          { name: 'payloadTons', label: 'Payload (t)', type: 'number', required: false },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ type: 'aeroplane', ...body })
          planes.reload()
        }}
      />

      <AddRecordForm
        title="Add aircraft type"
        fields={[
          { name: 'name', label: 'Type name', placeholder: 'A320 / 737' },
          { name: 'category', label: 'Category', placeholder: 'narrow-body / wide-body / freighter' },
          { name: 'payloadTons', label: 'Payload (t)', type: 'number', required: false },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ type: 'aircraft_type', ...body })
          types.reload()
        }}
      />

      <FilterBar>
        {['all', 'narrow-body', 'wide-body', 'freighter'].map((c) => (
          <FilterButton key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </FilterButton>
        ))}
      </FilterBar>

      <Card className="mb-4 p-4">
        <h3 className="mb-2 font-extrabold">Plane type catalog</h3>
        {filteredTypes.length === 0 ? (
          <p className="text-sm text-muted">No aircraft types in the fleet registry yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTypes.map((t) => (
              <div key={t.id} className="rounded-xl border border-line px-3 py-2 text-sm">
                <p className="font-bold">{t.name}</p>
                <p className="capitalize text-muted">
                  {t.category} · {t.payloadTons}t payload
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {planes.rows.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No aeroplanes yet. Use the form above to add one.</Card>
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Aeroplane' },
            { key: 'registration', label: 'Registration' },
            { key: 'airport', label: 'Airport Location' },
            { key: 'planeType', label: 'Plane Type' },
            { key: 'role', label: 'Role' },
            { key: 'payloadTons', label: 'Payload (t)' },
            {
              key: 'schedule',
              label: 'Departures',
              render: (r) => (Array.isArray(r.schedule) ? r.schedule.join(' · ') : '—'),
            },
            {
              key: 'compliance',
              label: 'Compliance',
              render: (r) => (r.compliance ? <StatusBadge status={r.compliance} /> : '—'),
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <button type="button" className="font-semibold text-brand" onClick={() => setSelected(r)}>
                  Details
                </button>
              ),
            },
          ]}
          rows={planes.rows}
        />
      )}

      {selected ? (
        <Card className="mt-4 p-5">
          <div className="mb-3 flex justify-between">
            <h3 className="text-lg font-extrabold">{selected.registration || selected.name} — Docs, GPS & downtime</h3>
            <button type="button" className="text-sm text-muted" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-surface p-3">
              <p className="text-xs text-muted">Avg speed</p>
              <p className="font-extrabold">{selected.avgSpeedKts || '—'} kts</p>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <p className="text-xs text-muted">Downtime</p>
              <p className="font-extrabold">{selected.downtimeHours || 0}h</p>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <p className="text-xs text-muted">Inspections</p>
              <p className="font-extrabold text-sm">{selected.inspections || '—'}</p>
            </div>
          </div>
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
