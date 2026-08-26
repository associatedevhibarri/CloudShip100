import { useMemo, useState } from 'react'
import { api } from '../services/api'
import { PageHeader } from '../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../components/ui/FilterBar'
import { LogisticsMap } from '../components/map/LogisticsMap'
import { Card } from '../components/ui/Card'

const filters = ['all', 'vehicle', 'ship', 'airplane', 'depot', 'cargo']

export default function MapPage() {
  const assets = api.getMapAssets()
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(
    () => (filter === 'all' ? assets : assets.filter((a) => a.type === filter)),
    [assets, filter],
  )

  return (
    <div>
      <PageHeader
        title="Live Map"
        subtitle="Vehicles, ships, airplanes, depots, and cargo across the corridor."
      />
      <FilterBar>
        {filters.map((f) => (
          <FilterButton key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All assets' : f}
          </FilterButton>
        ))}
      </FilterBar>

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
    </div>
  )
}
