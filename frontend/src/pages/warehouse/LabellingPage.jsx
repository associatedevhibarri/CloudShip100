import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'

export default function LabellingPage() {
  const { data, loading, error, reload } = useWarehouse()
  const parcels = data?.parcels || []
  const batches = data?.batches || []
  const [batchId, setBatchId] = useState('all')
  const [selected, setSelected] = useState(null)
  const [targetBatch, setTargetBatch] = useState('')
  const [flash, setFlash] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    if (!parcels.length) return
    setSelected((prev) => {
      if (!prev) return parcels.find((p) => p.id === 'PCL-1001') || parcels[0]
      return parcels.find((p) => p.id === prev.id) || prev
    })
  }, [parcels])

  const openBatches = useMemo(
    () => batches.filter((b) => b.status === 'open' || b.status === 'ready'),
    [batches],
  )

  useEffect(() => {
    if (!targetBatch && openBatches[0]) setTargetBatch(openBatches[0].id)
  }, [openBatches, targetBatch])

  const filtered = useMemo(
    () => (batchId === 'all' ? parcels : parcels.filter((p) => p.batchId === batchId)),
    [parcels, batchId],
  )

  const run = async (key, work, okMessage) => {
    setBusy(key)
    try {
      await work()
      await reload()
      setFlash(okMessage)
    } catch (err) {
      setFlash(err.message || 'Warehouse action failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <div>
      <PageHeader
        title="Labelling & Batching"
        subtitle="Print Cloud Ship labels, group parcels into outbound batches, close the batch for assignment."
      />
      <WarehouseGate loading={loading} error={error}>
        <>
          {flash ? (
            <p className="mb-4 rounded-xl border border-brand/20 bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">
              {flash}
            </p>
          ) : null}

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-muted">Parcels in yard</p>
              <p className="mt-1 text-2xl font-extrabold">{parcels.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-muted">Open batches</p>
              <p className="mt-1 text-2xl font-extrabold">{openBatches.length}</p>
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
                <button
                  type="button"
                  disabled={busy === 'label' || selected.status === 'dispatched'}
                  onClick={() =>
                    run('label', () => api.labelParcel(selected.id), `Printed label for ${selected.id}`)
                  }
                  className="mt-3 w-full rounded-full bg-brand-gradient py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {selected.labelCode ? 'Reprint label' : 'Print label'}
                </button>
                {openBatches.length ? (
                  <div className="mt-3 flex gap-2">
                    <select
                      value={targetBatch}
                      onChange={(e) => setTargetBatch(e.target.value)}
                      className="flex-1 rounded-xl border border-line bg-white px-2 py-2 text-xs font-semibold"
                    >
                      {openBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.id} · {b.destination}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy === 'batch' || !targetBatch}
                      onClick={() =>
                        run(
                          'batch',
                          () => api.addParcelToBatch(selected.id, targetBatch),
                          `Added ${selected.id} to ${targetBatch}`,
                        )
                      }
                      className="rounded-full border border-line px-3 py-2 text-xs font-bold text-ink disabled:opacity-50"
                    >
                      Add to batch
                    </button>
                  </div>
                ) : null}
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
              {
                key: 'actions',
                label: '',
                render: (r) =>
                  r.status === 'open' ? (
                    <button
                      type="button"
                      disabled={busy === `close-${r.id}`}
                      className="text-sm font-semibold text-brand disabled:opacity-50"
                      onClick={() =>
                        run(`close-${r.id}`, () => api.closeBatch(r.id), `Closed ${r.id} — ready for assignment`)
                      }
                    >
                      Close batch
                    </button>
                  ) : (
                    '—'
                  ),
              },
            ]}
            rows={batches}
          />
        </>
      </WarehouseGate>
    </div>
  )
}
