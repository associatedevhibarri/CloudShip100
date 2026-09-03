import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { LogisticsMap } from '../../components/map/LogisticsMap'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'
import { useToast } from '../../context/ToastContext'

export default function WarehouseZonesPage() {
  const { data, loading, error, reload } = useWarehouse()
  const toast = useToast()
  const zones = data?.zones || []
  const mapAssets = data?.mapAssets || []
  const [busyId, setBusyId] = useState('')

  const toggle = async (zone) => {
    setBusyId(zone.id)
    try {
      await api.toggleZone(zone.id, !zone.active)
      await reload()
      toast.success(`${zone.name} ${zone.active ? 'paused' : 'armed'}`)
    } catch (err) {
      toast.error(err.message || 'Could not update zone')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div>
      <PageHeader
        title="Trip Geofencing & Zones"
        subtitle="Dock, staging, dispatch bay, customer site, and corridor rules. Exit from dispatch starts tracking."
        actions={
          <Link to="/app/geomapping" className="text-sm font-bold text-brand hover:underline">
            Coverage geomapping →
          </Link>
        }
      />
      <WarehouseGate loading={loading} error={error}>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {['dock', 'staging', 'dispatch', 'delivery'].map((type) => (
            <Card key={type} className="p-4">
              <p className="text-xs font-semibold uppercase capitalize text-muted">{type}</p>
              <p className="mt-1 text-2xl font-extrabold">{zones.filter((z) => z.type === type).length}</p>
            </Card>
          ))}
        </div>

        <div className="mb-6">
          <LogisticsMap assets={mapAssets} zones={zones} height="420px" center={[-28.2, 29.4]} zoom={6} />
        </div>

        <DataTable
          columns={[
            { key: 'name', label: 'Zone' },
            { key: 'warehouse', label: 'Site' },
            { key: 'type', label: 'Type' },
            {
              key: 'radiusM',
              label: 'Radius',
              render: (r) =>
                r.radiusM ? `${r.radiusM >= 1000 ? `${r.radiusM / 1000} km` : `${r.radiusM} m`}` : 'Corridor',
            },
            { key: 'rule', label: 'Rule' },
            {
              key: 'exclusions',
              label: 'Exclusions',
              render: (r) => (r.exclusions?.length ? r.exclusions.join(', ') : 'None'),
            },
            {
              key: 'active',
              label: 'Active',
              render: (r) => (r.active ? 'Yes' : 'No'),
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  className="text-sm font-semibold text-brand disabled:opacity-50"
                  onClick={() => toggle(r)}
                >
                  {r.active ? 'Pause' : 'Arm'}
                </button>
              ),
            },
          ]}
          rows={zones}
        />
      </WarehouseGate>
    </div>
  )
}
