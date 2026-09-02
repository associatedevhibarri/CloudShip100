import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { Card } from '../../components/ui/Card'

export default function AirportsPage() {
  const airports = api.getAirports()
  const checkIns = api.getPilotCheckIns()

  return (
    <div>
      <PageHeader title="Airports" subtitle="Airport locations, hangars, and pilot check-in." />
      <DataTable
        columns={[
          { key: 'name', label: 'Airport Name' },
          { key: 'code', label: 'Code' },
          { key: 'location', label: 'Location' },
          { key: 'hangars', label: 'Hangars' },
          { key: 'hangarSlots', label: 'Hangar Slots' },
        ]}
        rows={airports}
      />
      <Card className="mt-4 p-5">
        <h3 className="mb-3 font-extrabold">Pilot Check In / Check Out</h3>
        <DataTable
          columns={[
            { key: 'pilot', label: 'Pilot' },
            { key: 'airport', label: 'Airport' },
            { key: 'type', label: 'Type' },
            { key: 'at', label: 'Time', render: (r) => new Date(r.at).toLocaleString() },
          ]}
          rows={checkIns}
        />
      </Card>
    </div>
  )
}
