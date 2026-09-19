import { useState } from 'react'
import { Bell, Megaphone } from 'lucide-react'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

const TABS = ['All', 'Updates', 'Promotions']

export default function CustomerNotificationsPage() {
  const toast = useToast()
  const { tokens } = useAuth()
  const token = tokens?.access?.token
  const notifications = usePortalFetch(portalService.getMyNotifications)
  const promotions = usePortalFetch(portalService.getPromotions)
  const [tab, setTab] = useState('All')
  const [saving, setSaving] = useState('')

  if (notifications.loading || promotions.loading) return <LoadingState label="Loading notifications..." />
  if (notifications.error || promotions.error) return <ErrorState message={notifications.error || promotions.error} />

  const markRead = async (id) => {
    if (!token) return
    setSaving(id)
    try {
      await portalService.markNotificationRead(token, id)
      notifications.refetch()
    } catch (err) {
      toast.error(err.message || 'Failed to mark as read')
    } finally {
      setSaving('')
    }
  }

  const dismiss = async (id) => {
    if (!token) return
    setSaving(id)
    try {
      await portalService.dismissNotification(token, id)
      notifications.refetch()
    } catch (err) {
      toast.error(err.message || 'Failed to dismiss')
    } finally {
      setSaving('')
    }
  }

  const feed = [
    ...(notifications.data || []).map((n) => ({ ...n, kind: 'update', time: n.sentAt?.slice(0, 10) })),
    ...(promotions.data || []).map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      time: p.postedAt?.slice(0, 10),
      kind: 'promotion',
    })),
  ].filter((item) => {
    if (tab === 'Updates') return item.kind === 'update'
    if (tab === 'Promotions') return item.kind === 'promotion'
    return true
  })

  return (
    <div>
      <PageHeader title="Notifications & Promotions" subtitle="Shipment updates and offers from CloudShip." />

      <FilterBar>
        {TABS.map((t) => (
          <FilterButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
          </FilterButton>
        ))}
      </FilterBar>

      {feed.length === 0 ? (
        <Card className="p-6 text-sm text-muted">Nothing here yet.</Card>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => (
            <Card key={`${item.kind}-${item.id}`} className={`p-4 ${item.unread ? 'border-brand/40 bg-brand-light/20' : ''}`}>
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    item.kind === 'promotion' ? 'bg-brand-light text-brand' : 'bg-surface text-ink'
                  }`}
                >
                  {item.kind === 'promotion' ? <Megaphone size={16} /> : <Bell size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-ink">{item.title}</p>
                    <span className="shrink-0 text-xs text-muted">{item.time}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                  {item.kind === 'update' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.unread ? (
                        <button
                          type="button"
                          disabled={saving === item.id}
                          className="rounded-full border border-line px-3 py-1 text-xs font-bold disabled:opacity-50"
                          onClick={() => markRead(item.id)}
                        >
                          Mark read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={saving === item.id}
                        className="rounded-full border border-line px-3 py-1 text-xs font-bold disabled:opacity-50"
                        onClick={() => dismiss(item.id)}
                      >
                        Dismiss
                      </button>
                    </div>
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
