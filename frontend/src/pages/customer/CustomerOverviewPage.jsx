import { Link } from 'react-router-dom'
import { Package, Receipt, ShieldCheck, Bell } from 'lucide-react'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

export default function CustomerOverviewPage() {
  const company = usePortalFetch(portalService.getMyCompany)
  const bookings = usePortalFetch(portalService.getMyBookings)
  const documents = usePortalFetch(portalService.getMyKycDocuments)
  const notifications = usePortalFetch(portalService.getMyNotifications)

  const loading = company.loading || bookings.loading || documents.loading || notifications.loading
  const error = company.error || bookings.error || documents.error || notifications.error

  if (loading) return <LoadingState label="Loading your portal..." />
  if (error) return <ErrorState message={error} />

  const bookingList = bookings.data || []
  const documentList = documents.data || []
  const notificationList = notifications.data || []
  const activeParcels = bookingList.filter((b) => b.status === 'pending' || b.status === 'in_transit')
  const expiringDocs = documentList.filter((d) => d.status === 'expiring' || d.status === 'non_compliant')
  const unread = notificationList.filter((n) => n.unread)

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${company.data.contact.split(' ')[0]}`}
        subtitle={`${company.data.name} · Client Portal overview`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Parcels" value={activeParcels.length} icon={Package} tone="brand" change={0} label="in transit or booked" />
        <StatCard title="Outstanding Balance" value={company.data.outstanding} prefix="$" icon={Receipt} change={0} label="across open invoices" />
        <StatCard title="Documents Needing Renewal" value={expiringDocs.length} icon={ShieldCheck} change={0} label="expiring or non-compliant" />
        <StatCard title="Unread Notifications" value={unread.length} icon={Bell} change={0} label="new updates" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-ink">Recent Parcels</h3>
            <Link to="/customer/tracking" className="text-sm font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          {bookingList.length === 0 ? (
            <p className="text-sm text-muted">No parcels booked yet.</p>
          ) : (
            <div className="space-y-3">
              {bookingList.slice(0, 4).map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-ink">{b.id}</p>
                    <p className="text-xs text-muted">{b.cargo}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-ink">Compliance Snapshot</h3>
            <Link to="/customer/documents" className="text-sm font-semibold text-brand hover:underline">
              Manage documents
            </Link>
          </div>
          {documentList.length === 0 ? (
            <p className="text-sm text-muted">No compliance documents on file yet.</p>
          ) : (
            <div className="space-y-3">
              {documentList.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-ink">{d.type}</p>
                    <p className="text-xs text-muted">{d.expiresAt ? `Expires ${d.expiresAt.slice(0, 10)}` : 'No expiry set'}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
