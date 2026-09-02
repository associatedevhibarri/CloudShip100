import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

export function useWarehouse() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const next = await api.getWarehouseSnapshot()
      setData(next)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load warehouse')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload }
}

export function WarehouseGate({ loading, error, children }) {
  if (loading) {
    return <p className="text-sm font-semibold text-muted">Loading warehouse from server…</p>
  }
  if (error) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
        {error}
      </p>
    )
  }
  return children
}
