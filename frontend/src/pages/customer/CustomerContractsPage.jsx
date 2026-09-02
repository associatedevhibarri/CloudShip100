import { useState } from 'react'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

export default function CustomerContractsPage() {
  const { data: contracts, loading, error } = usePortalFetch(portalService.getMyContracts)
  const [expandedId, setExpandedId] = useState(null)

  if (loading) return <LoadingState label="Loading your contracts..." />
  if (error) return <ErrorState message={error} />

  const contractList = contracts || []

  return (
    <div>
      <PageHeader title="Contracts" subtitle="Smart contracts covering price, pickup, destination and terms." />
      {contractList.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No contracts on file yet.</Card>
      ) : (
        <div className="space-y-3">
          {contractList.map((c) => {
            const expanded = expandedId === c.id
            return (
              <Card key={c.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-brand">{c.id}</p>
                    <h3 className="mt-1 text-lg font-extrabold">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {c.pickup} → {c.destination}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span className="font-semibold text-ink">${c.price.toLocaleString()}</span>
                  <span className="text-muted">
                    {c.startDate?.slice(0, 10)} → {c.endDate?.slice(0, 10)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : c.id)}
                  className="mt-3 text-sm font-semibold text-brand hover:underline"
                >
                  {expanded ? 'Hide terms' : 'View contract terms'}
                </button>
                {expanded ? (
                  <p className="mt-3 rounded-xl bg-surface p-3 text-sm text-muted">{c.terms}</p>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
