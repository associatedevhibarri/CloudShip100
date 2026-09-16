import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function CrewPage() {
  const { rows: crew, loading, error, reload } = useLiveList(() => api.getCrew(), 'crew')
  if (loading) return <LoadingState label="Loading crew..." />
  return (
    <div>
      <PageHeader title="Crew" subtitle="Pilot & crew profiles, licences, scheduling signals, and performance." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title="Add crew member"
        fields={[
          { name: 'name', label: 'Name' },
          { name: 'role', label: 'Role', placeholder: 'Pilot / Driver' },
          { name: 'license', label: 'License', required: false },
          { name: 'licenceExpiry', label: 'Licence expiry', inputType: 'date', required: false },
          { name: 'status', label: 'Status', placeholder: 'Available', required: false },
          { name: 'onTimeRate', label: 'On-time %', type: 'number', required: false },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ type: 'crew', ...body })
          reload()
        }}
      />
      {crew.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No crew yet. Use the form above to add one.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {crew.map((member) => (
            <Card key={member.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold">{member.name}</h3>
                  <p className="text-sm text-muted">{member.role}</p>
                </div>
                <StatusBadge status={member.status === 'Available' ? 'Available' : member.status || 'available'} />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">License</dt>
                  <dd className="font-semibold">{member.license || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Expires</dt>
                  <dd className="font-semibold">{member.licenceExpiry || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">On-time</dt>
                  <dd className="font-semibold">{member.onTimeRate != null ? `${member.onTimeRate}%` : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Behavior</dt>
                  <dd className="font-semibold">{member.behaviorScore || '—'}</dd>
                </div>
                {member.fuelEfficiency != null ? (
                  <div className="flex justify-between">
                    <dt className="text-muted">Fuel efficiency</dt>
                    <dd className="font-semibold">{member.fuelEfficiency}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-3 text-xs text-muted">
                Training: {Array.isArray(member.training) ? member.training.join(', ') : '—'}
              </p>
              <p className="mt-1 text-xs text-muted">Restrictions: {member.restrictions || '—'}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
