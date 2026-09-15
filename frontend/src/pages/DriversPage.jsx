import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

export default function DriversPage() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await api.getDrivers()
        if (!cancelled) setDrivers(Array.isArray(rows) ? rows : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load drivers')
          setDrivers([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <LoadingState label="Loading drivers..." />

  const onTrip = drivers.filter((d) => d.status === 'On Trip').length
  const available = drivers.length - onTrip
  const complete = drivers.filter((d) => d.profileComplete).length

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Registered driver accounts, licences, and trip status."
        actions={
          <Link to="/app/warehouse/drivers" className="text-sm font-bold text-brand hover:underline">
            Warehouse driver board →
          </Link>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Registered</p>
          <p className="text-2xl font-extrabold">{drivers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Available</p>
          <p className="text-2xl font-extrabold">{available}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">On trip</p>
          <p className="text-2xl font-extrabold">{onTrip}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Profile complete</p>
          <p className="text-2xl font-extrabold">{complete}</p>
        </Card>
      </div>

      {drivers.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">
          No drivers yet. Register a driver at /login?role=driver, then they will appear here.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {drivers.map((driver) => (
            <Card key={driver.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-brand">
                    {driver.employeeId || 'Unassigned ID'}
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold">{driver.name}</h3>
                  <p className="text-sm text-muted">{driver.email}</p>
                  <p className="text-sm text-muted">{driver.phone || 'No phone yet'}</p>
                </div>
                <StatusBadge status={driver.status === 'Available' ? 'Available' : 'in_progress'} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">License</dt>
                  <dd className="font-semibold">{driver.license || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Expiry</dt>
                  <dd className="font-semibold">{driver.licenceExpiry}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Vehicle</dt>
                  <dd className="font-semibold">{driver.assignedVehicle || 'None'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Profile</dt>
                  <dd className="font-semibold">{driver.completeness}%</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">ID documents</dt>
                  <dd className="font-semibold">{driver.idDocumentStatus}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Restrictions</dt>
                  <dd className="font-semibold">{driver.restrictions}</dd>
                </div>
              </dl>
              {driver.address ? <p className="mt-3 text-xs text-muted">{driver.address}</p> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
