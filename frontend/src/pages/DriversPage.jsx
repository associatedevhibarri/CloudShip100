import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'
import { useToast } from '../context/ToastContext'

export default function DriversPage() {
  const toast = useToast()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await api.getDrivers()
      setDrivers(Array.isArray(rows) ? rows : [])
    } catch (err) {
      setError(err.message || 'Failed to load drivers')
      setDrivers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const setApproval = async (driver, approvalStatus) => {
    if (!driver.employeeId) return
    setSaving(driver.employeeId)
    try {
      await api.setDriverApproval(driver.employeeId, approvalStatus)
      toast.success(`${driver.name} is now ${approvalStatus}.`)
      await load()
    } catch (err) {
      toast.error(err.message || 'Failed to update approval')
    } finally {
      setSaving('')
    }
  }

  if (loading) return <LoadingState label="Loading drivers..." />

  const onTrip = drivers.filter((d) => d.status === 'On Trip').length
  const available = drivers.length - onTrip
  const complete = drivers.filter((d) => d.profileComplete).length
  const pending = drivers.filter((d) => d.approvalStatus === 'pending').length

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Approve registered drivers before warehouse can assign parcels."
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

      <div className="mb-6 grid gap-3 sm:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Registered</p>
          <p className="text-2xl font-extrabold">{drivers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted">Pending approval</p>
          <p className="text-2xl font-extrabold">{pending}</p>
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
          No drivers yet. A driver can register at /login?role=driver, then you approve them here.
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
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={driver.approvalStatus || 'pending'} />
                  <StatusBadge status={driver.status === 'Available' ? 'Available' : 'in_progress'} />
                </div>
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
              {driver.employeeId ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {driver.approvalStatus !== 'active' ? (
                    <button
                      type="button"
                      disabled={saving === driver.employeeId}
                      className="rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      onClick={() => setApproval(driver, 'active')}
                    >
                      Approve
                    </button>
                  ) : null}
                  {driver.approvalStatus !== 'rejected' ? (
                    <button
                      type="button"
                      disabled={saving === driver.employeeId}
                      className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
                      onClick={() => setApproval(driver, 'rejected')}
                    >
                      Reject
                    </button>
                  ) : null}
                  {driver.approvalStatus === 'rejected' ? (
                    <button
                      type="button"
                      disabled={saving === driver.employeeId}
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                      onClick={() => setApproval(driver, 'pending')}
                    >
                      Reset to pending
                    </button>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
