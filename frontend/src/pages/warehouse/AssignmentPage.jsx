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
  const parcels = (data?.parcels || []).filter((p) => p.status !== 'expected')
  const registeredDrivers = data?.registeredDrivers || []
  const [fleet, setFleet] = useState('all')
  const [flash, setFlash] = useState('')
  const [picks, setPicks] = useState({})
  const [busyId, setBusyId] = useState('')

  const visible = useMemo(() => {
    if (fleet === 'all') return parcels
    if (fleet === 'unassigned') return parcels.filter((p) => !p.fleetType)
    return parcels.filter((p) => p.fleetType === fleet)
  }, [parcels, fleet])

  const applySuggestion = async (parcelId) => {
    const hint = suggestions.find((s) => s.parcelId === parcelId || s.id === parcelId)
    setBusyId(parcelId)
    try {
      await api.assignParcel(parcelId)
      await reload()
      if (hint) {
        setFlash(
          `Assigned ${parcelId} → ${hint.driver} (${hint.fleetType === 'own' ? 'own fleet' : hint.partner})`,
        )
      }
    } catch (err) {
      setFlash(err.message || 'Assignment failed')
    } finally {
      setBusyId('')
    }
  }

  const assignToDriver = async (parcelId) => {
    const employeeId = picks[parcelId] || registeredDrivers[0]?.employeeId
    if (!employeeId) {
      setFlash('Register a driver at /login?role=driver first, then assign using their employee ID.')
      return
    }
    const driver = registeredDrivers.find((d) => d.employeeId === employeeId)
    setBusyId(parcelId)
    try {
      await api.assignParcel(parcelId, employeeId)
      await reload()
      setFlash(`Assigned ${parcelId} → ${driver?.name || employeeId} (${employeeId}). Driver portal will show only this driver's parcels.`)
    } catch (err) {
      setFlash(err.message || 'Assignment failed')
    } finally {
      setBusyId('')
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
        subtitle="Parcel → truck → driver employee ID. Registered drivers see only their own parcels in Driver Portal."
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

        <div className="mb-6">
          <h3 className="mb-3 text-lg font-extrabold">Registered drivers</h3>
          {registeredDrivers.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {registeredDrivers.map((d) => (
                <Card key={d.employeeId} className="p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-brand">{d.employeeId}</p>
                  <p className="mt-1 font-extrabold text-ink">{d.name}</p>
                  <p className="text-xs text-muted">{d.email}</p>
                  <p className="mt-2 text-sm font-semibold">{d.vehicle || 'No vehicle yet'}</p>
                </Card>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
              No portal drivers yet. A driver registers at <span className="font-semibold text-ink">/login?role=driver</span>,
              gets an employee ID (DRV-01…), then you assign parcels here.
            </p>
          )}
        </div>

        {chain ? (
          <div className="mb-6 grid gap-2 sm:grid-cols-4">
            {[
              ['Parcel', chain.id, chain.cargo],
              [
                'Truck',
                chain.truck || '—',
                chain.fleetType === 'own' ? 'Own fleet' : chain.partner || 'Unassigned',
              ],
              ['Driver', chain.driver || '—', chain.driverEmployeeId || chain.fleetType || 'pending'],
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
            { key: 'truck', label: 'Truck', render: (r) => r.truck || '—' },
            { key: 'driver', label: 'Driver', render: (r) => r.driver || '—' },
            {
              key: 'driverEmployeeId',
              label: 'Driver ID',
              render: (r) => r.driverEmployeeId || '—',
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <div className="flex min-w-[220px] flex-col gap-2">
                  {registeredDrivers.length ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={picks[r.id] || registeredDrivers[0].employeeId}
                        onChange={(e) => setPicks((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold"
                      >
                        {registeredDrivers.map((d) => (
                          <option key={d.employeeId} value={d.employeeId}>
                            {d.employeeId} · {d.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        className="text-sm font-semibold text-brand disabled:opacity-50"
                        onClick={() => assignToDriver(r.id)}
                      >
                        Assign
                      </button>
                    </div>
                  ) : suggestions.some((s) => (s.parcelId || s.id) === r.id) && !r.truck ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      className="text-sm font-semibold text-brand disabled:opacity-50"
                      onClick={() => applySuggestion(r.id)}
                    >
                      Apply match
                    </button>
                  ) : (
                    '—'
                  )}
                </div>
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
