import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

export default function LabellingPage() {
  const { data, loading, error } = useWarehouse()
  const parcels = data?.parcels || []
  const batches = data?.batches || []
  const [batchId, setBatchId] = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!parcels.length) return
    setSelected((prev) => prev || parcels.find((p) => p.id === 'PCL-1001') || parcels[0])
  }, [parcels])

  const filtered = useMemo(
    () => (batchId === 'all' ? parcels : parcels.filter((p) => p.batchId === batchId)),
    [parcels, batchId],
  )

  return (
    <div>
      <PageHeader
        title="Labelling & Batching"
        subtitle="Print Cloud Ship labels, group parcels into outbound batches, close the batch for assignment."
      />
      <WarehouseGate loading={loading} error={error}>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Parcels in yard</p>
          <p className="mt-1 text-2xl font-extrabold">{parcels.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Open batches</p>
          <p className="mt-1 text-2xl font-extrabold">
            {batches.filter((b) => b.status === 'open' || b.status === 'ready').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted">Unlabelled</p>
          <p className="mt-1 text-2xl font-extrabold">{parcels.filter((p) => !p.labelCode).length}</p>
        </Card>
      </div>

      <FilterBar>
        <FilterButton active={batchId === 'all'} onClick={() => setBatchId('all')}>
          All parcels
        </FilterButton>
        {batches.map((b) => (
          <FilterButton key={b.id} active={batchId === b.id} onClick={() => setBatchId(b.id)}>
            {b.id}
          </FilterButton>
        ))}
      </FilterBar>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <DataTable
          columns={[
            { key: 'id', label: 'Parcel' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'client', label: 'Client' },
            {
              key: 'labelCode',
              label: 'Label',
              render: (r) => r.labelCode || '—',
            },
            {
              key: 'batchId',
              label: 'Batch',
              render: (r) => r.batchId || 'Unbatched',
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <button
                  type="button"
                  className="text-sm font-semibold text-brand"
                  onClick={() => setSelected(r)}
                >
                  Label
                </button>
              ),
            },
          ]}
          rows={filtered}
        />

        {selected ? (
          <Card className="p-5">
            <p className="text-xs font-extrabold uppercase tracking-wide text-brand">Label preview</p>
            <div className="mt-3 rounded-2xl border-2 border-dashed border-brand/40 bg-white p-4 font-mono text-xs">
              <p className="text-[10px] font-bold tracking-[0.2em] text-muted">CLOUD SHIP</p>
              <p className="mt-2 text-lg font-extrabold text-ink">{selected.labelCode || 'UNLABELLED'}</p>
              <p className="mt-3 font-semibold">{selected.id}</p>
              <p className="mt-1 text-muted">{selected.cargo}</p>
              <p className="mt-3">
                From: {selected.shipper}
                <br />
                To: {selected.consignee}
              </p>
              <p className="mt-3">
                {selected.pickup} → {selected.dropoff}
              </p>
              <p className="mt-3 text-[10px] text-muted">{selected.batchId || 'No batch'}</p>
            </div>
            <p className="mt-3 text-xs text-muted">
              Demo print only — barcode would encode {selected.id} for dock scanners.
            </p>
          </Card>
        ) : null}
      </div>

      <h3 className="mb-3 mt-8 text-lg font-extrabold">Batches</h3>
      <DataTable
        columns={[
          { key: 'id', label: 'Batch' },
          { key: 'name', label: 'Name' },
          { key: 'warehouse', label: 'Warehouse' },
          { key: 'destination', label: 'Destination' },
          {
            key: 'parcelIds',
            label: 'Parcels',
            render: (r) => (r.parcelIds || []).join(', '),
          },
          {
            key: 'status',
            label: 'Status',
            render: (r) => <StatusBadge status={r.status} />,
          },
        ]}
        rows={batches}
      />
      </WarehouseGate>
    </div>
  )
}
