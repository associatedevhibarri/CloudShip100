import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'

export default function NotificationsPage() {
  const notifications = api.getNotifications()
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Trips, compliance, geofence, and finance alerts." />
      <div className="space-y-3">
        {notifications.map((n) => (
          <Card
            key={n.id}
            className={`p-4 ${n.unread ? 'border-brand/40 bg-brand-light/30' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-extrabold text-ink">{n.title}</p>
                <p className="mt-1 text-sm text-muted">{n.body}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">{n.time}</p>
                {n.unread ? (
                  <span className="mt-1 inline-block rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                    NEW
                  </span>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
