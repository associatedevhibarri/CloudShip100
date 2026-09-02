import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable } from '../components/ui/DataTable'
import { Card } from '../components/ui/Card'

export default function CustomersPage() {
  const customers = api.getCustomers()
  return (
    <div>
      <PageHeader title="Customers" subtitle="Enterprise accounts and outstanding balances." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Accounts</p>
          <p className="text-2xl font-extrabold">{customers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Outstanding AR</p>
          <p className="text-2xl font-extrabold">
            ${customers.reduce((s, c) => s + c.outstanding, 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Enterprise</p>
          <p className="text-2xl font-extrabold">
            {customers.filter((c) => c.tier === 'Enterprise').length}
          </p>
        </Card>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Customer' },
          { key: 'contact', label: 'Contact' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'tier', label: 'Tier' },
          {
            key: 'outstanding',
            label: 'Outstanding',
            render: (r) => `$${r.outstanding.toLocaleString()}`,
          },
        ]}
        rows={customers}
      />
    </div>
  )
}
