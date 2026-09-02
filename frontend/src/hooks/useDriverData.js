import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { driverService } from '../services/driverService'

const EMPTY_HISTORY = {
  completedTrips: [],
  deliveredParcels: [],
  totalIncidents: 0,
  totalDeliveries: 0,
  totalTrips: 0,
}

export function useDriverData() {
  const { tokens } = useSelector((state) => state.auth)
  const token = tokens?.access?.token

  const [profile, setProfile] = useState(null)
  const [trips, setTrips] = useState([])
  const [activeTrips, setActiveTrips] = useState([])
  const [upcomingTrips, setUpcomingTrips] = useState([])
  const [completedTrips, setCompletedTrips] = useState([])
  const [parcels, setParcels] = useState([])
  const [damageLogs, setDamageLogs] = useState([])
  const [history, setHistory] = useState(EMPTY_HISTORY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const dashboard = await driverService.getDashboard(token)
      setProfile(dashboard.profile)
      setTrips(dashboard.trips)
      setActiveTrips(dashboard.activeTrips)
      setUpcomingTrips(dashboard.upcomingTrips)
      setCompletedTrips(dashboard.completedTrips)
      setParcels(dashboard.parcels)
      setDamageLogs(dashboard.damageLogs)
      setHistory(dashboard.history)
    } catch (err) {
      setError(err.message || 'Failed to load driver data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  return {
    profile,
    trips,
    activeTrips,
    upcomingTrips,
    completedTrips,
    parcels,
    damageLogs,
    history,
    loading,
    error,
    reload: load,
    token,
  }
}
