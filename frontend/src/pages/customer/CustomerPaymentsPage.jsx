import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { portalService } from '../../services/portalService'
import { usePortalFetch } from '../../hooks/usePortalFetch'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { LoadingState, ErrorState } from '../../components/ui/LoadingState'

// Generic payment options for the mock "Pay Now" confirmation — not per-customer data,
// no real payment processor is integrated yet.
const PAYMENT_METHODS = [
  { id: 'visa', label: 'Visa •••• 4821' },
  { id: 'mastercard', label: 'Mastercard •••• 0099' },
  { id: 'eft', label: 'EFT — Standard Bank' },
]

export default function CustomerPaymentsPage() {
  const { tokens } = useAuth()
  const { data: requests, loading, error, refetch } = usePortalFetch(portalService.getMyPaymentRequests)
  const [payingId, setPayingId] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].id)
  const [confirming, setConfirming] = useState(false)
  const [payError, setPayError] = useState('')

  if (loading) return <LoadingState label="Loading your payments..." />
  if (error) return <ErrorState message={error} />

  const requestList = requests || []
  const due = requestList.filter((r) => r.status === 'due' || r.status === 'overdue')
  const history = requestList.filter((r) => r.status === 'paid')
  const activeRequest = requestList.find((r) => r.id === payingId)

  const confirmPayment = async () => {
    setConfirming(true)
    setPayError('')
    try {
      await portalService.payPaymentRequest(tokens?.access?.token, payingId)
      setPayingId(null)
      refetch()
    } catch (err) {
      setPayError(err.message || 'Payment failed')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div>
      <PageHeader title="Payment Collection" subtitle="Outstanding and settled payments for your company." />

      <Card className="mb-6 p-5">
        <h3 className="mb-3 font-extrabold text-ink">Payment Due</h3>
        {due.length === 0 ? (
          <p className="text-sm text-muted">Nothing due right now.</p>
        ) : (
          <DataTable
            columns={[
              { key: 'id', label: 'Payment Request' },
              { key: 'amount', label: 'Amount', render: (row) => `$${row.amount.toLocaleString()}` },
              { key: 'dueDate', label: 'Due Date', render: (row) => row.dueDate?.slice(0, 10) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              {
                key: 'action',
                label: '',
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => {
                      setPayingId(row.id)
                      setSelectedMethod(PAYMENT_METHODS[0].id)
                      setPayError('')
                    }}
                    className="rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white hover:brightness-105"
                  >
                    Pay Now
                  </button>
                ),
              },
            ]}
            rows={due}
          />
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-extrabold text-ink">Payment History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted">No payments settled yet.</p>
        ) : (
          <DataTable
            columns={[
              { key: 'id', label: 'Payment Request' },
              { key: 'amount', label: 'Amount', render: (row) => `$${row.amount.toLocaleString()}` },
              { key: 'dueDate', label: 'Paid By', render: (row) => row.dueDate?.slice(0, 10) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
            rows={history}
          />
        )}
      </Card>

      {activeRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-extrabold text-ink">Pay Invoice</h3>
              <button type="button" onClick={() => setPayingId(null)} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-2xl font-extrabold text-ink">${activeRequest.amount.toLocaleString()}</p>
            <div className="mb-5 space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                    selectedMethod === m.id ? 'border-brand bg-brand-light/50' : 'border-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    checked={selectedMethod === m.id}
                    onChange={() => setSelectedMethod(m.id)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
            {payError ? <p className="mb-3 text-sm font-semibold text-rose-600">{payError}</p> : null}
            <button
              type="button"
              onClick={confirmPayment}
              disabled={confirming}
              className="w-full rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-60"
            >
              {confirming ? 'Confirming...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
