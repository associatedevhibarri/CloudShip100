import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { driverService } from '../services/driverService'

export function useDriverGps() {
  const token = useSelector((state) => state.auth.tokens?.access?.token)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!token || typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined
    }

    let cancelled = false
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (cancelled) return
        try {
          await driverService.pingLocation(token, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
            speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
            accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
            at: new Date(position.timestamp).toISOString(),
          })
          if (!cancelled) setStatus('live')
        } catch {
          if (!cancelled) setStatus('error')
        }
      },
      () => {
        if (!cancelled) setStatus('denied')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )

    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(watchId)
    }
  }, [token])

  return status
}
