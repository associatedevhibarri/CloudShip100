export const quoteFieldClass =
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'

export const MODES = ['Road', 'Air', 'Maritime', 'Rail']

export const todayIsoDate = () => new Date().toISOString().slice(0, 10)

export function toQuotePayload(values) {
  const body = {
    pickup: values.pickup.trim(),
    dropoff: values.dropoff.trim(),
    weightKg: Number(values.weightKg),
    mode: values.mode,
  }
  if (values.cargo?.trim()) body.cargo = values.cargo.trim()
  if (values.collectionBuildingType) body.collectionBuildingType = values.collectionBuildingType
  if (values.deliveryBuildingType) body.deliveryBuildingType = values.deliveryBuildingType
  if (values.cargoCategory) body.cargoCategory = values.cargoCategory
  if (Number(values.quantity) > 0) body.quantity = Number(values.quantity)
  if (values.unit) body.unit = values.unit
  if (values.dimensionUnit) body.dimensionUnit = values.dimensionUnit
  if (values.cargoForm) body.cargoForm = values.cargoForm
  if (values.flammable) body.flammable = true
  if (values.perishable) body.perishable = true
  if (values.fragile) body.fragile = true
  if (values.extraLabour) body.extraLabour = true
  if (values.pickupDate) body.pickupDate = values.pickupDate
  if (Number(values.lengthCm) > 0) body.lengthCm = Number(values.lengthCm)
  if (Number(values.widthCm) > 0) body.widthCm = Number(values.widthCm)
  if (Number(values.heightCm) > 0) body.heightCm = Number(values.heightCm)
  if (Number(values.declaredValue) > 0) body.declaredValue = Number(values.declaredValue)
  return body
}
