import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { useMemo, useState } from 'react'

export default function EquipmentPage() {
  const equipment = api.getRoadEquipment()
  const [cat, setCat] = useState('all')
  const cats = ['all', ...new Set(equipment.map((e) => e.category))]
  const rows = useMemo(
    () => (cat === 'all' ? equipment : equipment.filter((e) => e.category === cat)),
    [equipment, cat],
  )

  return (
    <div>
      <PageHeader
        title="Equipment / Assets"
        subtitle="Moving & lifting, packaging, and production lines."
      />
      <FilterBar>
        {cats.map((c) => (
          <FilterButton key={c} active={cat === c} onClick={() => setCat(c)}>
            {c === 'all' ? 'All categories' : c}
          </FilterButton>
        ))}
      </FilterBar>
      <DataTable
        columns={[
          { key: 'name', label: 'Equipment' },
          { key: 'category', label: 'Category' },
          { key: 'location', label: 'Location' },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rows={rows}
      />
    </div>
  )
}
