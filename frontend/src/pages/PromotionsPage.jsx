import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { portalService } from '../services/portalService'
import { usePortalFetch } from '../hooks/usePortalFetch'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { LoadingState, ErrorState } from '../components/ui/LoadingState'

export default function PromotionsPage() {
  const { tokens } = useAuth()
  const { data: promotions, loading, error, refetch } = usePortalFetch(portalService.getPromotions)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState('Promotion')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  if (loading) return <LoadingState label="Loading promotions..." />
  if (error) return <ErrorState message={error} />

  const promotionList = promotions || []

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await portalService.createPromotion(tokens?.access?.token, { title: title.trim(), body: body.trim(), tag })
      setTitle('')
      setBody('')
      setTag('Promotion')
      setShowForm(false)
      refetch()
    } catch (err) {
      setSubmitError(err.message || 'Failed to create promotion')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Promotions"
        subtitle="Broadcast offers to every customer's Notifications & Promotions feed."
        actions={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105"
          >
            <Megaphone size={16} />
            New promotion
          </button>
        }
      />

      {showForm ? (
        <Card className="mb-4 p-5">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-[1fr_1fr] sm:items-end">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 10% off Air Freight this month"
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-ink">Tag</span>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. Promotion"
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-semibold text-ink">Message</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Describe the offer customers will see."
                className="w-full rounded-lg border border-line px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-60 sm:justify-self-start"
            >
              {submitting ? 'Posting...' : 'Post promotion'}
            </button>
          </form>
          {submitError ? <p className="mt-2 text-sm font-semibold text-rose-600">{submitError}</p> : null}
        </Card>
      ) : null}

      {promotionList.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No promotions posted yet.</Card>
      ) : (
        <div className="space-y-3">
          {promotionList.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <Megaphone size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-ink">{p.title}</p>
                    <span className="shrink-0 text-xs text-muted">{p.postedAt?.slice(0, 10)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{p.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
