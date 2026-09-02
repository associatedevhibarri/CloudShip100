import { kpis, activitySeries, lostBookings, lostBookingsTotal } from '../data/kpis'
import { trips } from '../data/trips'
import { yards, vehicles, trailers, roadEquipment, checkIns } from '../data/road'
import { drivers, driverShifts } from '../data/drivers'
import {
  aircraftTypes,
  airports,
  aeroplanes,
  airEquipment,
  crew,
  pilotCheckIns,
} from '../data/air'
import { railSidings, locomotives, railYards, ports } from '../data/railMaritime'
import { customers, orders, invoices } from '../data/orders'
import { fuelLogs, yardFees, airportFees, salaries } from '../data/expenses'
import { geofences, routeOptimization, weatherAnalytics } from '../data/geo'
import { mapAssets } from '../data/mapAssets'
import { wallet, earnings, notifications } from '../data/finance'
import {
  parcels,
  batches,
  assignmentSuggestions,
  warehouseZones,
  dispatchEvents,
  warehouseRoutes,
  warehouseDrivers,
  warehouseMapAssets,
} from '../data/warehouse'
import { apiFetch, isLiveSession } from './http'

const localKpis = (list) => {
  const isToday = (iso) => {
    if (!iso) return false
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return false
    return d.toDateString() === new Date().toDateString()
  }
  const awaitingReceive = list.filter((p) => p.status === 'expected').length
  const inboundToday = list.filter((p) => p.status !== 'expected' && isToday(p.receivedAt)).length
  const labelled = list.filter((p) => p.labelCode).length
  const awaitingAssign = list.filter((p) => !p.fleetType && p.status !== 'expected' && p.status !== 'dispatched').length
  const dispatched = list.filter((p) => p.status === 'dispatched').length
  const assigned = list.filter((p) => p.fleetType)
  const own = assigned.filter((p) => p.fleetType === 'own').length
  const ownFleetShare = assigned.length ? Math.round((own / assigned.length) * 100) : 0
  return {
    awaitingReceive,
    inboundToday,
    labelled,
    awaitingAssign,
    dispatched,
    ownFleetShare,
    partnerShare: assigned.length ? 100 - ownFleetShare : 0,
  }
}

const localWarehouseSnapshot = () => ({
  kpis: localKpis(parcels),
  parcels: parcels.map((p) => ({ ...p })),
  batches: batches.map((b) => ({ ...b })),
  suggestions: assignmentSuggestions.map((s) => ({ ...s })),
  zones: warehouseZones.map((z) => ({ ...z })),
  events: [...dispatchEvents],
  routes: warehouseRoutes.map((r) => ({ ...r })),
  drivers: warehouseDrivers.map((d) => ({ ...d })),
  registeredDrivers: [],
  mapAssets: warehouseMapAssets.map((a) => ({ ...a })),
})

const pushLocalEvent = (parcelId, title, detail) => {
  dispatchEvents.push({
    id: `EVT-L-${Date.now()}`,
    parcelId,
    time: new Date().toTimeString().slice(0, 5),
    title,
    detail,
  })
}

const makeLocalLabel = (parcel) => {
  if (parcel.labelCode) return parcel.labelCode
  const num = String(parcel.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0')
  const slug =
    String(parcel.cargo || 'GEN')
      .split(/[\s—-]/)[0]
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 5)
      .toUpperCase() || 'GEN'
  return `CS-ZA-${num}-${slug}`
}

const applyLocalParcelAssign = (parcelId) => {
  const hint = assignmentSuggestions.find((s) => s.parcelId === parcelId)
  const parcel = parcels.find((p) => p.id === parcelId)
  if (hint && parcel) {
    Object.assign(parcel, {
      status: 'assigned',
      fleetType: hint.fleetType,
      truck: hint.truck,
      driver: hint.driver,
      partner: hint.partner,
    })
    pushLocalEvent(
      parcelId,
      'Smart assigned',
      `${hint.fleetType === 'own' ? 'Own fleet' : hint.partner} · ${hint.truck} · ${hint.driver}`,
    )
  }
  return parcel
}

const postWarehouse = async (path, body) => {
  await apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  })
  return apiFetch('/warehouse')
}

export const api = {
  getKpis: () => kpis,
  getActivity: () => activitySeries,
  getLostBookings: () => ({ items: lostBookings, total: lostBookingsTotal }),
  getTrips: (status) => (status ? trips.filter((t) => t.status === status) : trips),
  getYards: () => yards,
  getVehicles: () => vehicles,
  getTrailers: () => trailers,
  getRoadEquipment: () => roadEquipment,
  getCheckIns: () => checkIns,
  getDrivers: () => drivers,
  getDriverShifts: () => driverShifts,
  getAircraftTypes: (category) =>
    category ? aircraftTypes.filter((t) => t.category === category) : aircraftTypes,
  getAirports: () => airports,
  getAeroplanes: () => aeroplanes,
  getAirEquipment: () => airEquipment,
  getCrew: () => crew,
  getPilotCheckIns: () => pilotCheckIns,
  getRailSidings: () => railSidings,
  getLocomotives: () => locomotives,
  getRailYards: () => railYards,
  getPorts: () => ports,
  getCustomers: () => customers,
  getOrders: (status) => {
    if (!status) return orders
    if (status === 'history') return orders.filter((o) => o.status === 'completed' || o.status === 'history')
    return orders.filter((o) => o.status === status)
  },
  getInvoices: () => invoices,
  getFuelLogs: () => fuelLogs,
  getYardFees: () => yardFees,
  getAirportFees: () => airportFees,
  getSalaries: () => salaries,
  getGeofences: () => geofences,
  getRouteOptimization: () => routeOptimization,
  getWeatherAnalytics: () => weatherAnalytics,
  getMapAssets: () => mapAssets,
  getWallet: () => wallet,
  getEarnings: () => earnings,
  getNotifications: () => notifications,
  getWarehouseSnapshot: async () => {
    if (!isLiveSession()) return localWarehouseSnapshot()
    try {
      return await apiFetch('/warehouse')
    } catch {
      return localWarehouseSnapshot()
    }
  },
  receiveParcel: async (parcelId) => {
    if (!isLiveSession()) {
      const parcel = parcels.find((p) => p.id === parcelId)
      if (parcel && (parcel.status === 'expected' || !parcel.status)) {
        parcel.status = 'received'
        parcel.zone = 'Receiving dock'
        parcel.receivedAt = new Date().toISOString()
        pushLocalEvent(
          parcelId,
          'Received at warehouse',
          `${parcel.warehouse || 'Yard'} — receiving dock${parcel.orderId ? ` · ${parcel.orderId}` : ''}`,
        )
      }
      return localWarehouseSnapshot()
    }
    return postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/receive`)
  },
  assignParcel: async (parcelId, employeeId) => {
    if (!isLiveSession()) {
      applyLocalParcelAssign(parcelId)
      return localWarehouseSnapshot()
    }
    return postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/assign`, employeeId ? { employeeId } : {})
  },
  autoAssignParcels: async () => {
    if (!isLiveSession()) {
      assignmentSuggestions.forEach((s) => applyLocalParcelAssign(s.parcelId))
      return localWarehouseSnapshot()
    }
    return postWarehouse('/warehouse/parcels/auto-assign')
  },
  autoAssignRoutes: async () => {
    if (!isLiveSession()) {
      warehouseRoutes.forEach((r) => {
        if (r.status === 'suggested') r.status = 'assigned'
      })
      return localWarehouseSnapshot()
    }
    return postWarehouse('/warehouse/routes/auto-assign')
  },
  labelParcel: async (parcelId) => {
    if (!isLiveSession()) {
      const parcel = parcels.find((p) => p.id === parcelId)
      if (parcel) {
        parcel.labelCode = makeLocalLabel(parcel)
        if (parcel.status === 'received') parcel.status = 'labelled'
        pushLocalEvent(parcelId, 'Labelled', parcel.labelCode)
      }
      return localWarehouseSnapshot()
    }
    return postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/label`)
  },
  addParcelToBatch: async (parcelId, batchId) => {
    if (!isLiveSession()) {
      const parcel = parcels.find((p) => p.id === parcelId)
      const batch = batches.find((b) => b.id === batchId)
      if (parcel && batch) {
        parcel.batchId = batchId
        if (!batch.parcelIds.includes(parcelId)) batch.parcelIds.push(parcelId)
        if (batch.status === 'open') batch.status = 'ready'
        if (parcel.status === 'received') parcel.status = 'labelled'
        pushLocalEvent(parcelId, 'Batched', batchId)
      }
      return localWarehouseSnapshot()
    }
    return postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/batch`, { batchId })
  },
  closeBatch: async (batchId) => {
    if (!isLiveSession()) {
      const batch = batches.find((b) => b.id === batchId)
      if (batch && batch.status !== 'dispatched') batch.status = 'ready'
      return localWarehouseSnapshot()
    }
    return postWarehouse(`/warehouse/batches/${encodeURIComponent(batchId)}/close`)
  },
  dispatchParcel: async (parcelId) => {
    if (!isLiveSession()) {
      const parcel = parcels.find((p) => p.id === parcelId)
      if (parcel && (parcel.driver || parcel.fleetType)) {
        parcel.status = 'dispatched'
        parcel.zone = 'Dispatch bay'
        pushLocalEvent(parcelId, 'Dispatched', 'Left dispatch bay geofence')
      }
      return localWarehouseSnapshot()
    }
    return postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/dispatch`)
  },
}
