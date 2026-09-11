import { useEffect, useState } from 'react'
import { MapPin, Percent, Table } from 'lucide-react'
import { portalService } from '../../services/portalService'
import { Card } from '../../components/ui/Card'
import { FormField, formInputClass, SectionHeader } from '../../components/ui/FormField'
import { PickupAddressFields } from '../../components/ui/PickupAddressFields'
import { emptyPickupAddress, formatPickupAddress, parsePickupAddress } from '../../utils/pickupAddress'

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50'
const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface disabled:opacity-50'

const emptyPickup = { name: '', ...emptyPickupAddress, isDefault: false }
const emptyRate = { label: 'Standard shipping', minWeightKg: 0, maxWeightKg: '', country: '', price: '' }

export function ShopCheckoutSettings({ stores, token, toast, onSaved, preferredStoreId }) {
  const active = (stores || []).filter((s) => s.status === 'active')
  const [storeId, setStoreId] = useState(preferredStoreId || active[0]?.id || '')
  const [saving, setSaving] = useState(false)
  const [extraMarginPercent, setExtraMarginPercent] = useState(0)
  const [pickupStrategy, setPickupStrategy] = useState('fixed')
  const [pickups, setPickups] = useState([{ ...emptyPickup, name: 'Main warehouse', isDefault: true }])
  const [tableRates, setTableRates] = useState([])

  const selected = active.find((s) => s.id === storeId) || active[0]

  useEffect(() => {
    const ids = (stores || []).filter((s) => s.status === 'active').map((s) => s.id)
    if (preferredStoreId && ids.includes(preferredStoreId)) {
      setStoreId(preferredStoreId)
      return
    }
    setStoreId((current) => (current && ids.includes(current) ? current : ids[0] || ''))
  }, [stores, preferredStoreId])

  useEffect(() => {
    if (!selected) return
    const settings = selected.settings || {}
    setExtraMarginPercent(settings.extraMarginPercent || 0)
    setPickupStrategy(settings.pickupStrategy || 'fixed')
    const rows = settings.pickupLocations && settings.pickupLocations.length
      ? settings.pickupLocations
      : [{ name: 'Main warehouse', address: settings.pickupAddress || '', isDefault: true }]
    setPickups(
      rows.map((row) => ({
        name: row.name || '',
        ...emptyPickupAddress,
        ...parsePickupAddress(row),
        isDefault: Boolean(row.isDefault),
      })),
    )
    setTableRates(
      (settings.tableRates || []).map((row) => ({
        label: row.label || 'Standard shipping',
        minWeightKg: row.minWeightKg || 0,
        maxWeightKg: row.maxWeightKg == null ? '' : row.maxWeightKg,
        country: row.country || '',
        price: row.price,
      })),
    )
  }, [selected])

  if (!active.length) return null

  const save = async (e) => {
    e.preventDefault()
    if (!storeId) return
    setSaving(true)
    try {
      const pickupLocations = pickups
        .map((row, i) => {
          const address = formatPickupAddress(row)
          return {
            name: row.name.trim() || `Warehouse ${i + 1}`,
            street: row.street.trim(),
            city: row.city.trim(),
            state: row.state.trim(),
            postalCode: row.postalCode.trim(),
            country: row.country.trim() || 'ZA',
            address,
            isDefault: Boolean(row.isDefault),
          }
        })
        .filter((row) => row.street || row.city)
      if (!pickupLocations.some((row) => row.isDefault) && pickupLocations[0]) {
        pickupLocations[0].isDefault = true
      }
      await portalService.updateEcommerceStore(token, storeId, {
        settings: {
          extraMarginPercent: Number(extraMarginPercent) || 0,
          pickupStrategy,
          pickupAddress: pickupLocations.find((row) => row.isDefault)?.address || pickupLocations[0]?.address || '',
          pickupLocations,
          tableRates: tableRates
            .filter((row) => Number(row.price) >= 0 && row.price !== '')
            .map((row) => ({
              label: row.label.trim() || 'Standard shipping',
              minWeightKg: Number(row.minWeightKg) || 0,
              maxWeightKg: row.maxWeightKg === '' ? null : Number(row.maxWeightKg),
              country: String(row.country || '').trim().toUpperCase(),
              price: Number(row.price),
            })),
          paymentRules: { collectAtCheckout: true, autoBookOnPaid: true },
        },
      })
      toast.success('Checkout rules saved')
      onSaved?.()
    } catch (err) {
      toast.error(err.message || 'Could not save checkout rules')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5">
      <SectionHeader
        icon={MapPin}
        title="Checkout rules"
        description="This is where warehouses live — default pickup, extra locations, closest-to-customer, your extra profit, and optional table rates."
      />
      <form onSubmit={save} className="grid gap-4">
        <FormField id="rulesStore" label="Store">
          <select
            id="rulesStore"
            className={formInputClass()}
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {active.map((s) => (
              <option key={s.id} value={s.id}>
                {s.storeName} ({s.platform})
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          id="extraMarginPercent"
          label="Your extra % on shipping"
          hint="CloudShip already adds 10%. This is your cut on top, so you can make a profit on logistics."
        >
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-muted" />
            <input
              id="extraMarginPercent"
              type="number"
              min="0"
              step="0.1"
              className={formInputClass()}
              value={extraMarginPercent}
              onChange={(e) => setExtraMarginPercent(e.target.value)}
            />
          </div>
        </FormField>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">If you have more than one pickup</legend>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="pickupStrategy"
              checked={pickupStrategy === 'fixed'}
              onChange={() => setPickupStrategy('fixed')}
            />
            Always ship from the default warehouse
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="pickupStrategy"
              checked={pickupStrategy === 'closest'}
              onChange={() => setPickupStrategy('closest')}
            />
            Automatically use the closest warehouse to the customer
          </label>
        </fieldset>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Pickup locations</p>
          {pickups.map((row, i) => (
            <div key={i} className="mb-3 rounded-xl border border-line bg-surface/50 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <input
                  className={`${formInputClass()} min-w-[10rem] flex-1`}
                  placeholder="Warehouse name"
                  value={row.name}
                  onChange={(e) =>
                    setPickups((prev) => prev.map((p, idx) => (idx === i ? { ...p, name: e.target.value } : p)))
                  }
                />
                <label className="flex items-center gap-1 text-xs font-semibold">
                  <input
                    type="radio"
                    name="defaultPickup"
                    checked={row.isDefault}
                    onChange={() =>
                      setPickups((prev) => prev.map((p, idx) => ({ ...p, isDefault: idx === i })))
                    }
                  />
                  Default
                </label>
                {pickups.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-600"
                    onClick={() => setPickups((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <PickupAddressFields
                idPrefix={`pickup-${i}`}
                value={row}
                onChange={(next) => setPickups((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...next } : p)))}
              />
              <p className="mt-1.5 text-[11px] text-muted">
                Search Google or type street, city, postal code and country — not city only.
              </p>
            </div>
          ))}
          <button
            type="button"
            className={btnGhost}
            onClick={() => setPickups((prev) => [...prev, { ...emptyPickup }])}
          >
            Add pickup
          </button>
        </div>

        <div>
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
            <Table size={16} /> Table rates (optional)
          </p>
          <p className="mb-2 text-xs text-muted">
            Like WooCommerce table rate shipping. Customer pays this price when weight (and country) match. Hidden if it
            would be cheaper than the live courier plus CloudShip 10%.
          </p>
          {tableRates.map((row, i) => (
            <div key={i} className="mb-2 grid gap-2 sm:grid-cols-5">
              <input
                className={formInputClass()}
                placeholder="Label"
                value={row.label}
                onChange={(e) =>
                  setTableRates((prev) => prev.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)))
                }
              />
              <input
                className={formInputClass()}
                type="number"
                min="0"
                placeholder="Min kg"
                value={row.minWeightKg}
                onChange={(e) =>
                  setTableRates((prev) => prev.map((r, idx) => (idx === i ? { ...r, minWeightKg: e.target.value } : r)))
                }
              />
              <input
                className={formInputClass()}
                type="number"
                min="0"
                placeholder="Max kg"
                value={row.maxWeightKg}
                onChange={(e) =>
                  setTableRates((prev) => prev.map((r, idx) => (idx === i ? { ...r, maxWeightKg: e.target.value } : r)))
                }
              />
              <input
                className={formInputClass()}
                placeholder="Country ZA"
                value={row.country}
                onChange={(e) =>
                  setTableRates((prev) => prev.map((r, idx) => (idx === i ? { ...r, country: e.target.value } : r)))
                }
              />
              <input
                className={formInputClass()}
                type="number"
                min="0"
                placeholder="Price"
                value={row.price}
                onChange={(e) =>
                  setTableRates((prev) => prev.map((r, idx) => (idx === i ? { ...r, price: e.target.value } : r)))
                }
              />
            </div>
          ))}
          <button type="button" className={btnGhost} onClick={() => setTableRates((prev) => [...prev, { ...emptyRate }])}>
            Add table rate
          </button>
        </div>

        <p className="text-xs text-muted">
          Payment: the shopper pays shipping at CloudShip checkout. Set PAYMENT_MODE=stripe plus Stripe keys in backend
          .env for live cards; otherwise CloudShip uses mock pay. Couriers bill CloudShip&apos;s courier account, not
          the shopper.
        </p>
        <div>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Saving…' : 'Save checkout rules'}
          </button>
        </div>
      </form>
    </Card>
  )
}
