import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'

export default function CrewPage() {
  const crew = api.getCrew()
  return (
    <div>
      <PageHeader
        title="Crew"
        subtitle="Pilot & crew profiles, licences, scheduling signals, and performance."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {crew.map((member) => (
          <Card key={member.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold">{member.name}</h3>
                <p className="text-sm text-muted">{member.role}</p>
              </div>
              <StatusBadge status={member.status === 'Available' ? 'Available' : 'in_progress'} />
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">License</dt>
                <dd className="font-semibold">{member.license}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Expires</dt>
                <dd className="font-semibold">{member.licenceExpiry}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">On-time</dt>
                <dd className="font-semibold">{member.onTimeRate}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Behavior</dt>
                <dd className="font-semibold">{member.behaviorScore}</dd>
              </div>
              {member.fuelEfficiency != null ? (
                <div className="flex justify-between">
                  <dt className="text-muted">Fuel efficiency</dt>
                  <dd className="font-semibold">{member.fuelEfficiency}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-3 text-xs text-muted">Training: {member.training.join(', ')}</p>
            <p className="mt-1 text-xs text-muted">Restrictions: {member.restrictions}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
