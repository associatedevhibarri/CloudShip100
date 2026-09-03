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
  getLeads: async () => {
    if (!isLiveSession()) return []
    return apiFetch('/leads')
  },
  getPricingRates: async () => {
    if (!isLiveSession()) {
      return [
        { mode: 'Road', baseFee: 50, perKm: 1.2, perKg: 0.5, active: true },
        { mode: 'Air', baseFee: 200, perKm: 3.5, perKg: 2, active: true },
        { mode: 'Maritime', baseFee: 150, perKm: 0.3, perKg: 0.8, active: true },
        { mode: 'Rail', baseFee: 80, perKm: 0.6, perKg: 0.6, active: true },
      ]
    }
    return apiFetch('/pricing/rates')
  },
  savePricingRates: async (body) => {
    if (!isLiveSession()) return body.rates || []
    return apiFetch('/pricing/rates', { method: 'PUT', body: JSON.stringify(body) })
  },
  getFuelLogs: () => fuelLogs,
  getYardFees: () => yardFees,
  getAirportFees: () => airportFees,
  getSalaries: () => salaries,
  getGeofences: async () => {
    if (!isLiveSession()) return geofences.map((g) => ({ ...g, exclusions: [...(g.exclusions || [])] }))
    try {
      return await apiFetch('/geofences')
    } catch {
      return geofences.map((g) => ({ ...g, exclusions: [...(g.exclusions || [])] }))
    }
  },
  createGeofence: async (body) => {
    if (!isLiveSession()) {
      const row = {
        id: `GEO-L-${Date.now()}`,
        exclusions: [],
        active: true,
        radiusKm: null,
        lat: null,
        lng: null,
        ...body,
      }
      geofences.push(row)
      return { ...row }
    }
    return apiFetch('/geofences', { method: 'POST', body: JSON.stringify(body) })
  },
  deleteGeofence: async (id) => {
    if (!isLiveSession()) {
      const idx = geofences.findIndex((g) => g.id === id)
      if (idx >= 0) geofences.splice(idx, 1)
      return null
    }
    return apiFetch(`/geofences/${id}`, { method: 'DELETE' })
  },
  evaluateGeofence: async ({ lat, lng }) => {
    if (!isLiveSession()) {
      const toRad = (d) => (d * Math.PI) / 180
      const dist = (aLat, aLng, bLat, bLng) => {
        const dLat = toRad(bLat - aLat)
        const dLng = toRad(bLng - aLng)
        const x =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
        return 2 * 6371 * Math.asin(Math.sqrt(x))
      }
      const matchedRules = []
      const exclusions = new Set()
      const exceptions = []
      for (const rule of geofences) {
        if (rule.active === false) continue
        if (rule.scope === 'radius' && rule.lat != null && rule.lng != null && rule.radiusKm != null) {
          const distanceKm = dist(lat, lng, rule.lat, rule.lng)
          if (distanceKm <= rule.radiusKm) {
            matchedRules.push({ ...rule, distanceKm: Math.round(distanceKm * 1000) / 1000, inside: true })
            ;(rule.exclusions || []).forEach((e) => {
              exclusions.add(e)
              exceptions.push({ ruleId: rule.id, exclusion: e, rule: rule.rule })
            })
          }
        } else if (rule.lat != null && rule.lng != null) {
          const distanceKm = dist(lat, lng, rule.lat, rule.lng)
          if (distanceKm <= 100) {
            matchedRules.push({ ...rule, distanceKm: Math.round(distanceKm * 1000) / 1000, inside: true })
            ;(rule.exclusions || []).forEach((e) => {
              exclusions.add(e)
              exceptions.push({ ruleId: rule.id, exclusion: e, rule: rule.rule })
            })
          }
        }
      }
      return {
        lat,
        lng,
        matchedRules,
        exclusions: [...exclusions],
        exceptions,
        allowed: exceptions.length === 0,
      }
    }
    return apiFetch('/geofences/evaluate', { method: 'POST', body: JSON.stringify({ lat, lng }) })
  },
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
  assignParcel: async (parcelId, employeeId, extra = {}) => {
    if (!isLiveSession()) {
      applyLocalParcelAssign(parcelId)
      if (extra.driver) {
        const parcel = parcels.find((p) => p.id === parcelId)
        if (parcel) {
          Object.assign(parcel, {
            status: 'assigned',
            fleetType: extra.fleetType || parcel.fleetType,
            truck: extra.truck || parcel.truck,
            driver: extra.driver,
            partner: extra.partner ?? parcel.partner,
          })
        }
      }
      return localWarehouseSnapshot()
    }
    return postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/assign`, {
      ...(employeeId ? { employeeId } : {}),
      ...extra,
    })
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
        if (r.status === 'suggested' || r.status === 'assigned') {
          r.status = 'assigned'
          r.optimized = true
          r.optimizedHrs = Math.round((r.baselineHrs || r.optimizedHrs || 8) * 0.85 * 10) / 10
          r.fuelSavePct = Math.max(r.fuelSavePct || 0, 15)
        }
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
  createBatch: async ({ name, warehouse, destination }) => {
    if (!isLiveSession()) {
      const id = `BAT-${String(batches.length + 1).padStart(3, '0')}`
      batches.push({
        id,
        name,
        warehouse,
        destination,
        parcelIds: [],
        status: 'open',
        createdAt: new Date().toISOString(),
      })
      return localWarehouseSnapshot()
    }
    return postWarehouse('/warehouse/batches', { name, warehouse, destination })
  },
  optimizeRoute: async (routeId) => {
    if (!isLiveSession()) {
      const route = warehouseRoutes.find((r) => r.id === routeId)
      if (route) {
        route.status = 'assigned'
        route.optimized = true
        route.optimizedHrs = Math.round((route.baselineHrs || 8) * 0.85 * 10) / 10
        route.fuelSavePct = 15
      }
      return localWarehouseSnapshot()
    }
    return postWarehouse(`/warehouse/routes/${encodeURIComponent(routeId)}/optimize`)
  },
  toggleZone: async (zoneId, active) => {
    if (!isLiveSession()) {
      const zone = warehouseZones.find((z) => z.id === zoneId)
      if (zone) zone.active = active
      return localWarehouseSnapshot()
    }
    return postWarehouse(`/warehouse/zones/${encodeURIComponent(zoneId)}/toggle`, { active })
  },
}
