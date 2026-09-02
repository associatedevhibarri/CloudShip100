import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Shared loading/error/data wrapper for the Client Portal's "mine"-scoped API calls.
 * `fetchFn` receives the current access token and must return a promise.
 */
export function usePortalFetch(fetchFn) {
  const { tokens } = useAuth()
  const token = tokens?.access?.token
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetchFn(token)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refetch: load }
}
