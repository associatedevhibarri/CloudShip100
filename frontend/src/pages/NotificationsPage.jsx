import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await api.getNotifications()
        if (!cancelled) setNotifications(Array.isArray(rows) ? rows : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load notifications')
          setNotifications([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="Loading notifications..." />

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Booking, billing, and company alerts." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      {notifications.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">
          No notifications yet. Alerts created with customer bookings will appear here.
        </Card>
      ) : (
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
                  {n.customer && n.customer !== '—' ? (
                    <p className="mt-1 text-xs font-semibold text-brand">{n.customer}</p>
                  ) : null}
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
      )}
    </div>
  )
}
