import { Link } from 'react-router-dom'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

export default function CustomerInvoicesPage() {
  const { data: invoices, loading, error } = usePortalFetch(portalService.getMyInvoices)

  if (loading) return <LoadingState label="Loading your invoices..." />
  if (error) return <ErrorState message={error} />

  const invoiceList = invoices || []
  const outstanding = invoiceList.filter((i) => i.status === 'Open').reduce((sum, i) => sum + i.amount, 0)
  const paid = invoiceList.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0)

  return (
    <div>
      <PageHeader title="Invoicing" subtitle="Invoices issued to your company." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard title="Outstanding" value={outstanding} prefix="$" change={0} label="across open invoices" tone="brand" />
        <StatCard title="Paid to Date" value={paid} prefix="$" change={0} label="settled invoices" />
      </div>

      {invoiceList.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No invoices issued yet.</Card>
      ) : (
        <DataTable
          columns={[
            { key: 'id', label: 'Invoice' },
            { key: 'amount', label: 'Amount', render: (row) => `$${row.amount.toLocaleString()}` },
            { key: 'due', label: 'Due Date', render: (row) => row.due?.slice(0, 10) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            {
              key: 'action',
              label: '',
              render: (row) =>
                row.status === 'Open' ? (
                  <Link to="/customer/payments" className="text-sm font-semibold text-brand hover:underline">
                    Pay Now
                  </Link>
                ) : (
                  <span className="text-sm text-muted">Settled</span>
                ),
            },
          ]}
          rows={invoiceList}
        />
      )}
    </div>
  )
}
