import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'

export default function CheckInPage() {
  const rows = api.getCheckIns()
  return (
    <div>
      <PageHeader title="Driver Check In / Check Out" subtitle="Yard gate activity log." />
      <DataTable
        columns={[
          { key: 'driver', label: 'Driver' },
          { key: 'yard', label: 'Yard' },
          { key: 'type', label: 'Type' },
          {
            key: 'at',
            label: 'Timestamp',
            render: (r) => new Date(r.at).toLocaleString(),
          },
        ]}
        rows={rows}
      />
    </div>
  )
}
