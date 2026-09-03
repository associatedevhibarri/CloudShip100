import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import { PageHeader } from '../../components/ui/PageHeader'
import { FilterBar, FilterButton } from '../../components/ui/FilterBar'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataTable } from '../../components/ui/DataTable'
import { FormField, formInputClass } from '../../components/ui/FormField'
import { WarehouseGate, useWarehouse } from '../../hooks/useWarehouse'
import { useToast } from '../../context/ToastContext'

export default function LabellingPage() {
  const { data, loading, error, reload } = useWarehouse()
  const toast = useToast()
  const parcels = (data?.parcels || []).filter((p) => p.status !== 'expected')
  const batches = data?.batches || []
  const [batchId, setBatchId] = useState('all')
  const [selected, setSelected] = useState(null)
  const [targetBatch, setTargetBatch] = useState('')
  const [busy, setBusy] = useState('')
  const [batchForm, setBatchForm] = useState({ name: '', warehouse: '', destination: '' })

  useEffect(() => {
    if (!parcels.length) return
    setSelected((prev) => {
      if (!prev) return parcels.find((p) => p.status === 'received' || p.status === 'labelled') || parcels[0]
      return parcels.find((p) => p.id === prev.id) || prev
    })
  }, [parcels])

  const openBatches = useMemo(
    () => batches.filter((b) => b.status === 'open' || b.status === 'ready'),
    [batches],
  )

  const yards = useMemo(
    () => [...new Set(parcels.map((p) => p.warehouse).filter(Boolean))],
    [parcels],
  )

  useEffect(() => {
    if (!targetBatch && openBatches[0]) setTargetBatch(openBatches[0].id)
  }, [openBatches, targetBatch])

  useEffect(() => {
    setBatchForm((prev) => ({
      ...prev,
      warehouse: prev.warehouse || yards[0] || '',
    }))
  }, [yards])

  const filtered = useMemo(
    () => (batchId === 'all' ? parcels : parcels.filter((p) => p.batchId === batchId)),
    [parcels, batchId],
  )

  const run = async (key, work, okMessage) => {
    setBusy(key)
    try {
      await work()
      await reload()
      toast.success(okMessage)
    } catch (err) {
      toast.error(err.message || 'Warehouse action failed')
    } finally {
      setBusy('')
    }
  }

  const createBatch = async (e) => {
    e.preventDefault()
    await run(
      'create-batch',
      () => api.createBatch(batchForm),
      `Opened batch ${batchForm.name}`,
    )
    setBatchForm({ name: '', warehouse: yards[0] || '', destination: '' })
  }

  return (
    <div>
      <PageHeader
        title="Labelling & Batching"
        subtitle="Print Cloud Ship labels, group parcels into outbound batches, close the batch for assignment."
      />
      <WarehouseGate loading={loading} error={error}>
        <>
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

          <Card className="mb-6 p-5">
            <h3 className="text-lg font-extrabold">Open a new batch</h3>
            <p className="mt-1 text-sm text-muted">Same pattern as customer bookings — create the record, then add parcels.</p>
            <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={createBatch}>
              <FormField id="batch-name" label="Name" required>
                <input
                  id="batch-name"
                  required
                  value={batchForm.name}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={formInputClass()}
                  placeholder="Rice outbound — JHB"
                />
              </FormField>
              <FormField id="batch-yard" label="Yard" required>
                <input
                  id="batch-yard"
                  required
                  list="yard-options"
                  value={batchForm.warehouse}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, warehouse: e.target.value }))}
                  className={formInputClass()}
                  placeholder="Durban Central Yard"
                />
                <datalist id="yard-options">
                  {yards.map((yard) => (
                    <option key={yard} value={yard} />
                  ))}
                </datalist>
              </FormField>
              <FormField id="batch-dest" label="Destination" required>
                <input
                  id="batch-dest"
                  required
                  value={batchForm.destination}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, destination: e.target.value }))}
                  className={formInputClass()}
                  placeholder="City Deep, Johannesburg"
                />
              </FormField>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={busy === 'create-batch'}
                  className="w-full rounded-full bg-brand-gradient py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  Create batch
                </button>
              </div>
            </form>
          </Card>

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

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
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
              <Card className="min-w-0 p-5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-brand">Label preview</p>
                <div className="mt-3 rounded-2xl border-2 border-dashed border-brand/40 bg-white p-4 font-mono text-xs">
                  <p className="text-[10px] font-bold tracking-[0.2em] text-muted">CLOUD SHIP</p>
                  <p className="mt-2 break-all text-lg font-extrabold text-ink">{selected.labelCode || 'UNLABELLED'}</p>
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
                  <div className="mt-3 flex min-w-0 flex-col gap-2">
                    <select
                      value={targetBatch}
                      onChange={(e) => setTargetBatch(e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold"
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
                      className="w-full rounded-full border border-line px-3 py-2 text-xs font-bold text-ink disabled:opacity-50"
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
                render: (r) => (r.parcelIds || []).join(', ') || '—',
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
