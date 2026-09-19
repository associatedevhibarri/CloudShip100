import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'
import { useToast } from '../context/ToastContext'

export default function NotificationsPage() {
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await api.getNotifications()
      setNotifications(Array.isArray(rows) ? rows : [])
    } catch (err) {
      setError(err.message || 'Failed to load notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const markRead = async (id) => {
    setSaving(id)
    try {
      await api.markNotificationRead(id)
      setNotifications((rows) => rows.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    } catch (err) {
      toast.error(err.message || 'Failed to mark as read')
    } finally {
      setSaving('')
    }
  }

  const dismiss = async (id) => {
    setSaving(id)
    try {
      await api.dismissNotification(id)
      setNotifications((rows) => rows.filter((n) => n.id !== id))
    } catch (err) {
      toast.error(err.message || 'Failed to dismiss')
    } finally {
      setSaving('')
    }
  }

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
            <Card key={n.id} className={`p-4 ${n.unread ? 'border-brand/40 bg-brand-light/30' : ''}`}>
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
              <div className="mt-3 flex flex-wrap gap-2">
                {n.unread ? (
                  <button
                    type="button"
                    disabled={saving === n.id}
                    className="rounded-full border border-line px-3 py-1 text-xs font-bold disabled:opacity-50"
                    onClick={() => markRead(n.id)}
                  >
                    Mark read
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={saving === n.id}
                  className="rounded-full border border-line px-3 py-1 text-xs font-bold disabled:opacity-50"
                  onClick={() => dismiss(n.id)}
                >
                  Dismiss
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
