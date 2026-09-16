import { useEffect, useState } from 'react'

export function useLiveList(loader, key = '') {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await loader()
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load')
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // loader is keyed so callers can pass an inline function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick])

  const reload = () => setTick((n) => n + 1)
  return { rows, loading, error, reload }
}
