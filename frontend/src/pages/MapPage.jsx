import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { DEMO_REASONS, PageHeader, DemoDataNote } from '../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../components/ui/FilterBar'
import { LogisticsMap } from '../components/map/LogisticsMap'
import { Card } from '../components/ui/Card'
import { ErrorState, LoadingState } from '../components/ui/LoadingState'

const filters = ['all', 'vehicle', 'ship', 'airplane', 'depot', 'cargo']

export default function MapPage() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await api.getMapAssets()
        if (!cancelled) setAssets(Array.isArray(rows) ? rows : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load map assets')
          setAssets([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? assets : assets.filter((a) => a.type === filter)),
    [assets, filter],
  )

  if (loading) return <LoadingState label="Loading map..." />

  return (
    <div>
      <PageHeader
        title="Live Map"
        subtitle="Warehouse dispatch markers from assigned and dispatched parcels."
      />
      <div className="mb-4">
        <DemoDataNote>{DEMO_REASONS.mapGps}</DemoDataNote>
      </div>
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <FilterBar>
        {filters.map((f) => (
          <FilterButton key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All assets' : f}
          </FilterButton>
        ))}
      </FilterBar>

      {filtered.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">
          No map markers yet. Dispatch a warehouse parcel to place a vehicle marker.
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
          <LogisticsMap assets={filtered} height="620px" zoom={5} />
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-muted">Asset list</h3>
            <ul className="max-h-[580px] space-y-2 overflow-y-auto">
              {filtered.map((asset) => (
                <li key={asset.id} className="rounded-xl border border-line px-3 py-2">
                  <p className="text-sm font-bold text-ink">{asset.label}</p>
                  <p className="text-xs capitalize text-muted">
                    {asset.type} · {asset.status?.replaceAll('_', ' ')}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}
