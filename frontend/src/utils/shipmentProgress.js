const STAGE_ORDER = ['booked', 'warehouse', 'in_transit', 'out_for_delivery', 'delivered']

export const DEFAULT_TIMELINE = [
  { stage: 'booked', label: 'Booked' },
  { stage: 'warehouse', label: 'Warehouse' },
  { stage: 'in_transit', label: 'In Transit' },
  { stage: 'out_for_delivery', label: 'Out for Delivery' },
  { stage: 'delivered', label: 'Delivered' },
]

const COURIER_STAGE = {
  submitted: 'booked',
  'deposit-pending': 'booked',
  'collection-assigned': 'booked',
  'awaiting-dropoff': 'booked',
  'collection-exception': 'booked',
  'collection-failed-attempt': 'booked',
  collected: 'warehouse',
  'at-hub': 'warehouse',
  manifested: 'warehouse',
  'ready-for-dispatch': 'warehouse',
  'swad-dimensions': 'warehouse',
  'swad-imaging': 'warehouse',
  'floor-check': 'warehouse',
  'in-transit': 'in_transit',
  'at-destination-hub': 'in_transit',
  'returned-to-hub': 'in_transit',
  'out-for-delivery': 'out_for_delivery',
  'delivery-assigned': 'out_for_delivery',
  'in-locker': 'out_for_delivery',
  'delivery-exception': 'out_for_delivery',
  'delivery-failed-attempt': 'out_for_delivery',
  delivered: 'delivered',
  'ready-for-pickup': 'delivered',
  completed: 'delivered',
  oc: 'booked',
  'label-created': 'booked',
  'shipment-information-sent-to-fedex': 'booked',
  pending: 'booked',
  scheduled: 'booked',
  pu: 'warehouse',
  'picked-up': 'warehouse',
  ar: 'warehouse',
  'arrived-at-fedex-location': 'warehouse',
  pickup: 'warehouse',
  'pickup-complete': 'warehouse',
  'en-route-to-pickup': 'warehouse',
  'arrived-at-pickup': 'warehouse',
  it: 'in_transit',
  tr: 'in_transit',
  dp: 'in_transit',
  'departed-fedex-location': 'in_transit',
  od: 'out_for_delivery',
  'on-fedex-vehicle-for-delivery': 'out_for_delivery',
  dropoff: 'out_for_delivery',
  'en-route-to-dropoff': 'out_for_delivery',
  'arrived-at-dropoff': 'out_for_delivery',
  dl: 'delivered',
}

const normalizeCourierStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')
    .replace(/\s+/g, '-')

export function courierStatusToStage(courierStatus) {
  return COURIER_STAGE[normalizeCourierStatus(courierStatus)] || null
}

export function displayShipmentStatus(row) {
  const fromCourier = courierStatusToStage(row?.courierStatus)
  if (fromCourier) return fromCourier
  if (row?.status === 'completed' || row?.status === 'history' || row?.status === 'delivered') return 'delivered'
  if (row?.logisticsBookingRef || row?.trackingNumber) return 'booked'
  return row?.status || 'pending'
}

export function displayShipmentLabel(row) {
  const ref = String(row?.logisticsBookingRef || row?.trackingNumber || '')
  if (ref.startsWith('STUB-') || ref.startsWith('TRK-STUB-')) return 'courier book failed'
  if (row?.courierStatus) return String(row.courierStatus).replaceAll('_', ' ').replaceAll('-', ' ')
  return displayShipmentStatus(row)
}

/** Mark every stage up to and including the current status. No skipped holes. */
export function progressTimeline(timeline, status) {
  const current =
    status === 'completed' || status === 'history' || status === 'delivered' ? 'delivered' : status || 'pending'
  const currentIdx = STAGE_ORDER.indexOf(current)
  const base = timeline && timeline.length ? timeline : DEFAULT_TIMELINE
  return base.map((step) => {
    const stepIdx = STAGE_ORDER.indexOf(step.stage)
    const done = currentIdx >= 0 ? stepIdx >= 0 && stepIdx <= currentIdx : Boolean(step.done)
    return {
      stage: step.stage,
      label: step.label || DEFAULT_TIMELINE.find((s) => s.stage === step.stage)?.label || step.stage,
      timestamp: step.timestamp || null,
      done,
    }
  })
}
