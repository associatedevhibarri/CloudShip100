import { useAuth } from '../../context/AuthContext'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

export default function CustomerAccountPage() {
  const { user } = useAuth()
  const { data: company, loading, error } = usePortalFetch(portalService.getMyCompany)

  if (loading) return <LoadingState label="Loading your account..." />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <PageHeader title="Account" subtitle="Your CloudShip Client Portal profile." />
      <Card className="p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Name</dt>
            <dd className="mt-1 font-extrabold">{user?.name || company.contact}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Company</dt>
            <dd className="mt-1 font-extrabold">{company.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Email</dt>
            <dd className="mt-1 font-semibold">{user?.email || company.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Phone</dt>
            <dd className="mt-1 font-semibold">{company.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Tier</dt>
            <dd className="mt-1 font-semibold">{company.tier}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Outstanding</dt>
            <dd className="mt-1 font-semibold">${company.outstanding.toLocaleString()}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
