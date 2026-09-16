import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'
import { AddRecordForm } from '../components/ui/AddRecordForm'
import { useLiveList } from '../hooks/useLiveList'

function ExpenseList({ title, subtitle, kind, fields, loader, loaderKey, columns, empty }) {
  const { rows, loading, error, reload } = useLiveList(loader, loaderKey)
  if (loading) return <LoadingState label={`Loading ${title.toLowerCase()}...`} />
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title={`Add ${title.toLowerCase()}`}
        fields={fields}
        submitLabel="Save"
        onSubmit={async (body) => {
          await api.createExpense({ kind, ...body })
          reload()
        }}
      />
      {rows.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">{empty}</Card>
      ) : (
        <DataTable columns={columns} rows={rows} />
      )}
    </div>
  )
}

export function FuelLogsPage() {
  return (
    <ExpenseList
      title="Fuel Logs"
      subtitle="Road and air fuel purchases from the expense ledger."
      kind="fuel"
      loader={() => api.getFuelLogs()}
      loaderKey="fuel"
      empty="No fuel logs yet. Use the form above to add one."
      fields={[
        { name: 'date', label: 'Date', inputType: 'date' },
        { name: 'asset', label: 'Asset / vehicle' },
        { name: 'liters', label: 'Liters', type: 'number' },
        { name: 'cost', label: 'Cost', type: 'number' },
        { name: 'location', label: 'Location' },
      ]}
      columns={[
        { key: 'date', label: 'Date' },
        { key: 'asset', label: 'Asset' },
        { key: 'liters', label: 'Liters' },
        { key: 'cost', label: 'Cost', render: (r) => `$${(Number(r.cost) || 0).toLocaleString()}` },
        { key: 'location', label: 'Location' },
      ]}
    />
  )
}

export function YardFeesPage() {
  return (
    <ExpenseList
      title="Yard Fees"
      subtitle="Parking and handling charges from the expense ledger."
      kind="yard_fee"
      loader={() => api.getYardFees()}
      loaderKey="yard_fee"
      empty="No yard fees yet. Use the form above to add one."
      fields={[
        { name: 'date', label: 'Date', inputType: 'date' },
        { name: 'yard', label: 'Yard' },
        { name: 'description', label: 'Description' },
        { name: 'amount', label: 'Amount', type: 'number' },
      ]}
      columns={[
        { key: 'date', label: 'Date' },
        { key: 'yard', label: 'Yard' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', render: (r) => `$${(Number(r.amount) || 0).toLocaleString()}` },
      ]}
    />
  )
}

export function AirportFeesPage() {
  return (
    <ExpenseList
      title="Airport Fees"
      subtitle="Landing, parking, and cargo handling from the expense ledger."
      kind="airport_fee"
      loader={() => api.getAirportFees()}
      loaderKey="airport_fee"
      empty="No airport fees yet. Use the form above to add one."
      fields={[
        { name: 'date', label: 'Date', inputType: 'date' },
        { name: 'airport', label: 'Airport' },
        { name: 'description', label: 'Description' },
        { name: 'amount', label: 'Amount', type: 'number' },
      ]}
      columns={[
        { key: 'date', label: 'Date' },
        { key: 'airport', label: 'Airport' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', render: (r) => `$${(Number(r.amount) || 0).toLocaleString()}` },
      ]}
    />
  )
}

export function SalariesPage() {
  return (
    <ExpenseList
      title="Salaries"
      subtitle="Driver and crew payroll from the expense ledger."
      kind="salary"
      loader={() => api.getSalaries()}
      loaderKey="salary"
      empty="No salary records yet. Use the form above to add one."
      fields={[
        { name: 'period', label: 'Period', placeholder: 'e.g. Sep 2026' },
        { name: 'person', label: 'Person' },
        { name: 'role', label: 'Role' },
        { name: 'amount', label: 'Amount', type: 'number' },
      ]}
      columns={[
        { key: 'period', label: 'Period' },
        { key: 'person', label: 'Person' },
        { key: 'role', label: 'Role' },
        { key: 'amount', label: 'Amount', render: (r) => `$${(Number(r.amount) || 0).toLocaleString()}` },
      ]}
    />
  )
}
