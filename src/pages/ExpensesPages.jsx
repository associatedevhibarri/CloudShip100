import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable } from '../components/ui/DataTable'

export function FuelLogsPage() {
  return (
    <div>
      <PageHeader title="Fuel Logs" subtitle="Road and air fuel purchases." />
      <DataTable
        columns={[
          { key: 'date', label: 'Date' },
          { key: 'asset', label: 'Asset' },
          { key: 'liters', label: 'Liters' },
          { key: 'cost', label: 'Cost', render: (r) => `$${r.cost.toLocaleString()}` },
          { key: 'location', label: 'Location' },
        ]}
        rows={api.getFuelLogs()}
      />
    </div>
  )
}

export function YardFeesPage() {
  return (
    <div>
      <PageHeader title="Yard Fees" subtitle="Parking and handling charges." />
      <DataTable
        columns={[
          { key: 'date', label: 'Date' },
          { key: 'yard', label: 'Yard' },
          { key: 'description', label: 'Description' },
          { key: 'amount', label: 'Amount', render: (r) => `$${r.amount.toLocaleString()}` },
        ]}
        rows={api.getYardFees()}
      />
    </div>
  )
}

export function AirportFeesPage() {
  return (
    <div>
      <PageHeader title="Airport Fees" subtitle="Landing, parking, and cargo handling." />
      <DataTable
        columns={[
          { key: 'date', label: 'Date' },
          { key: 'airport', label: 'Airport' },
          { key: 'description', label: 'Description' },
          { key: 'amount', label: 'Amount', render: (r) => `$${r.amount.toLocaleString()}` },
        ]}
        rows={api.getAirportFees()}
      />
    </div>
  )
}

export function SalariesPage() {
  return (
    <div>
      <PageHeader title="Salaries" subtitle="Driver and crew payroll snapshot." />
      <DataTable
        columns={[
          { key: 'period', label: 'Period' },
          { key: 'person', label: 'Person' },
          { key: 'role', label: 'Role' },
          { key: 'amount', label: 'Amount', render: (r) => `$${r.amount.toLocaleString()}` },
        ]}
        rows={api.getSalaries()}
      />
    </div>
  )
}
