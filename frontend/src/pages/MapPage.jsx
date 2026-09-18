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
    const load = async () => {
      setError('')
      try {
        const rows = await api.getMapAssets()
        if (!cancelled) {
          setAssets(Array.isArray(rows) ? rows : [])
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load map assets')
          setAssets([])
          setLoading(false)
        }
      }
    }
    load()
    const timer = window.setInterval(load, 15000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
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
        subtitle="Driver phone GPS. Empty until a driver shares location from the portal."
      />
      {assets.some((a) => a.fresh) ? null : (
        <div className="mb-4">
          <DemoDataNote>
            {assets.length
              ? 'Last pings are older than 2 minutes. Ask the driver to keep the portal open with location allowed.'
              : DEMO_REASONS.mapGps}
          </DemoDataNote>
        </div>
      )}
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
          No map markers yet. A driver must keep the portal open and allow location.
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
