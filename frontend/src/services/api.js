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
}
