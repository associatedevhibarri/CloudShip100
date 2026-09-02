import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'

export default function WalletPage() {
  const wallet = api.getWallet()
  const earnings = api.getEarnings()

  return (
    <div>
      <PageHeader title="Wallet & Earnings" subtitle="Balances, payouts, and modal revenue mix." />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card tone="brand" className="p-5">
          <p className="text-sm text-white/80">Available balance</p>
          <p className="mt-2 text-3xl font-extrabold">
            ${wallet.balance.toLocaleString()}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Pending payouts</p>
          <p className="mt-2 text-3xl font-extrabold">${wallet.pendingPayouts.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted">Monthly earnings</p>
          <p className="mt-2 text-3xl font-extrabold">${wallet.monthlyEarnings.toLocaleString()}</p>
        </Card>
      </div>

      <Card className="mb-4 p-5">
        <h3 className="mb-3 font-extrabold">Earnings by mode</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={earnings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="road" stackId="1" stroke="#007BFF" fill="#007BFF" fillOpacity={0.7} />
              <Area type="monotone" dataKey="air" stackId="1" stroke="#4DA3FF" fill="#4DA3FF" fillOpacity={0.7} />
              <Area type="monotone" dataKey="maritime" stackId="1" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.7} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <DataTable
        columns={[
          { key: 'date', label: 'Date' },
          { key: 'label', label: 'Transaction' },
          {
            key: 'amount',
            label: 'Amount',
            render: (r) => (
              <span className={r.amount >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                {r.amount >= 0 ? '+' : ''}
                ${Math.abs(r.amount).toLocaleString()}
              </span>
            ),
          },
        ]}
        rows={wallet.transactions}
      />
    </div>
  )
}
