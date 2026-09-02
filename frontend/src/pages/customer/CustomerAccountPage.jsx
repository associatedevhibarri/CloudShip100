import { useAuth } from '../../context/AuthContext'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { api } from '../../services/api'

export default function CustomerAccountPage() {
  const { user } = useAuth()
  const customer = api.getCustomers()[0]

  return (
    <div>
      <PageHeader title="Account" subtitle="Customer profile for the Cloud Ship portal demo." />
      <Card className="p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Name</dt>
            <dd className="mt-1 font-extrabold">{user?.name || customer.contact}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Company</dt>
            <dd className="mt-1 font-extrabold">{customer.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Email</dt>
            <dd className="mt-1 font-semibold">{user?.email || customer.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Phone</dt>
            <dd className="mt-1 font-semibold">{customer.phone}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Tier</dt>
            <dd className="mt-1 font-semibold">{customer.tier}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-muted">Outstanding</dt>
            <dd className="mt-1 font-semibold">${customer.outstanding.toLocaleString()}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
