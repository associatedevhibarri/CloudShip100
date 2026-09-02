import { useMemo, useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

export default function AssignmentPage() {
  const { data, loading, error, reload } = useWarehouse()
  const suggestions = data?.suggestions || []
  const parcels = data?.parcels || []
  const [fleet, setFleet] = useState('all')
  const [flash, setFlash] = useState('')

  const visible = useMemo(() => {
    if (fleet === 'all') return parcels
    if (fleet === 'unassigned') return parcels.filter((p) => !p.fleetType)
    return parcels.filter((p) => p.fleetType === fleet)
  }, [parcels, fleet])

  const applySuggestion = async (parcelId) => {
    const hint = suggestions.find((s) => s.parcelId === parcelId || s.id === parcelId)
    await api.assignParcel(parcelId)
    await reload()
    if (hint) {
      setFlash(
        `Assigned ${parcelId} → ${hint.driver} (${hint.fleetType === 'own' ? 'own fleet' : hint.partner})`,
      )
    }
  }

  const autoAssignAll = async () => {
    await api.autoAssignParcels()
    await reload()
    setFlash('Auto-assigned all open parcels using 4PL capacity rules.')
  }

  const chain = parcels.find((p) => p.id === 'PCL-1001')

  return (
    <div>
      <PageHeader
        title="Smart Assignment"
        subtitle="Parcel → truck → driver → client. Own fleet first; if you do not own the capacity, assign a subcontractor."
        actions={
          <button
            type="button"
            onClick={autoAssignAll}
            className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-bold text-white shadow-sm"
          >
            Auto-assign open parcels
          </button>
        }
      />
      <WarehouseGate loading={loading} error={error}>
        {flash ? (
          <p className="mb-4 rounded-xl border border-brand/20 bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">
            {flash}
          </p>
        ) : null}

        {chain ? (
          <div className="mb-6 grid gap-2 sm:grid-cols-4">
            {[
              ['Parcel', chain.id, chain.cargo],
              [
                'Truck',
                chain.truck || '—',
                chain.fleetType === 'own' ? 'Own fleet' : chain.partner || 'Unassigned',
              ],
              ['Driver', chain.driver || '—', chain.fleetType || 'pending'],
              ['Client', chain.client, `${chain.pickup} → ${chain.dropoff}`],
            ].map(([label, title, sub]) => (
              <Card key={label} className="p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-brand">{label}</p>
                <p className="mt-1 font-extrabold text-ink">{title}</p>
                <p className="mt-1 text-xs text-muted">{sub}</p>
              </Card>
            ))}
          </div>
        ) : null}

        <FilterBar>
          {[
            ['all', 'All'],
            ['own', 'Own fleet'],
            ['subcontractor', '4PL partners'],
            ['unassigned', 'Unassigned'],
          ].map(([id, label]) => (
            <FilterButton key={id} active={fleet === id} onClick={() => setFleet(id)}>
              {label}
            </FilterButton>
          ))}
        </FilterBar>

        <DataTable
          columns={[
            { key: 'id', label: 'Parcel' },
            { key: 'client', label: 'Client' },
            { key: 'cargo', label: 'Cargo' },
            {
              key: 'fleetType',
              label: 'Capacity',
              render: (r) =>
                r.fleetType ? (
                  <StatusBadge status={r.fleetType} />
                ) : (
                  <span className="text-xs text-muted">Unassigned</span>
                ),
            },
            {
              key: 'partner',
              label: 'Partner',
              render: (r) => r.partner || 'Cloud Ship',
            },
            { key: 'truck', label: 'Truck', render: (r) => r.truck || '—' },
            { key: 'driver', label: 'Driver', render: (r) => r.driver || '—' },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: 'actions',
              label: '',
              render: (r) =>
                suggestions.some((s) => (s.parcelId || s.id) === r.id) && !r.truck ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand"
                    onClick={() => applySuggestion(r.id)}
                  >
                    Apply match
                  </button>
                ) : (
                  '—'
                ),
            },
          ]}
          rows={visible}
        />

        <h3 className="mb-3 mt-8 text-lg font-extrabold">Engine suggestions</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {suggestions.map((s) => (
            <Card key={s.parcelId || s.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold">{s.parcelId || s.id}</p>
                <span className="text-xs font-bold text-brand">{s.score}% fit</span>
              </div>
              <p className="mt-2 text-sm text-muted">{s.reason}</p>
              <p className="mt-3 text-sm font-semibold">
                {s.driver} · {s.truck}
              </p>
              <p className="text-xs text-muted">{s.fleetType === 'own' ? 'Own fleet' : s.partner}</p>
            </Card>
          ))}
        </div>
      </WarehouseGate>
    </div>
  )
}
