import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'

export default function InvoicesPage() {
  return (
    <div>
      <PageHeader title="Invoices" subtitle="Billing status for logistics settlements." />
      <DataTable
        columns={[
          { key: 'id', label: 'Invoice' },
          { key: 'customer', label: 'Customer' },
          {
            key: 'amount',
            label: 'Amount',
            render: (r) => `$${r.amount.toLocaleString()}`,
          },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'due', label: 'Due' },
        ]}
        rows={api.getInvoices()}
      />
    </div>
  )
}
