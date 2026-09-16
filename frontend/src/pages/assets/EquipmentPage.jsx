import { useMemo, useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { Card } from '../../components/ui/Card'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { AddRecordForm } from '../../components/ui/AddRecordForm'
import { useLiveList } from '../../hooks/useLiveList'

export default function EquipmentPage() {
  const { rows: equipment, loading, error, reload } = useLiveList(() => api.getRoadEquipment(), 'equipment')
  const [cat, setCat] = useState('all')
  const cats = ['all', ...new Set(equipment.map((e) => e.category).filter(Boolean))]
  const rows = useMemo(
    () => (cat === 'all' ? equipment : equipment.filter((e) => e.category === cat)),
    [equipment, cat],
  )

  if (loading) return <LoadingState label="Loading equipment..." />

  return (
    <div>
      <PageHeader title="Equipment / Assets" subtitle="Moving & lifting, packaging, and production lines." />
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <AddRecordForm
        title="Add equipment"
        fields={[
          { name: 'name', label: 'Equipment' },
          { name: 'category', label: 'Category' },
          { name: 'location', label: 'Location' },
          { name: 'status', label: 'Status', placeholder: 'available' },
        ]}
        onSubmit={async (body) => {
          await api.createFleetAsset({ type: 'equipment', ...body })
          reload()
        }}
      />
      {equipment.length === 0 && !error ? (
        <Card className="p-8 text-center text-sm text-muted">No road equipment yet. Use the form above to add one.</Card>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
