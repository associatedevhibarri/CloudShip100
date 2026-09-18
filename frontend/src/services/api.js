import { apiFetch } from './http'

const postWarehouse = async (path, body) => {
  await apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  })
  return apiFetch('/warehouse')
}

const companyName = (company) => {
  if (!company) return '—'
  if (typeof company === 'string') return company
  return company.name || '—'
}

const formatDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10)
}

const formatWhen = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

const mapOrder = (booking) => ({
  id: booking.code || booking.id,
  customer: companyName(booking.company),
  status: booking.status,
  mode: booking.mode,
  cargo: booking.cargo,
  value: Number(booking.value) || 0,
  createdAt: formatDate(booking.bookedAt),
  pickup: booking.pickup,
  dropoff: booking.dropoff,
})

const mapInvoice = (invoice) => ({
  id: invoice.id,
  customer: companyName(invoice.company),
  amount: Number(invoice.amount) || 0,
  status: invoice.status,
  due: formatDate(invoice.due),
})

const mapDriver = (driver) => ({
  id: driver.id,
  employeeId: driver.employeeId || '',
  name: driver.name,
  email: driver.email || '',
  phone: driver.phone || '',
  address: driver.address || '',
  license: driver.license || '',
  licenceExpiry: formatDate(driver.licenceExpiry),
  restrictions: driver.restrictions || 'None',
  assignedVehicle: driver.assignedVehicle || '',
  idDocumentStatus: driver.idDocumentStatus || 'Pending',
  status: driver.status || 'Available',
  completeness: Number(driver.completeness) || 0,
  profileComplete: Boolean(driver.profileComplete),
  approvalStatus: driver.approvalStatus || 'pending',
})

const mapNotification = (notification) => ({
  id: notification.id,
  title: notification.title,
  body: notification.body,
  unread: Boolean(notification.unread),
  type: notification.type,
  time: formatWhen(notification.sentAt),
  customer: companyName(notification.company),
})

export const api = {
  getTrips: async (status) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    const rows = await apiFetch(`/trips${query}`)
    return Array.isArray(rows) ? rows : []
  },
  getYards: async () => {
    const rows = await apiFetch('/fleet?type=yard')
    return Array.isArray(rows) ? rows : []
  },
  getVehicles: async () => {
    const rows = await apiFetch('/fleet?type=vehicle')
    return Array.isArray(rows) ? rows : []
  },
  getTrailers: async () => {
    const rows = await apiFetch('/fleet?type=trailer')
    return Array.isArray(rows) ? rows : []
  },
  getRoadEquipment: async () => {
    const rows = await apiFetch('/fleet?type=equipment')
    return Array.isArray(rows) ? rows : []
  },
  getCheckIns: async () => {
    const rows = await apiFetch('/fleet?type=check_in')
    return Array.isArray(rows) ? rows : []
  },
  getDrivers: async () => {
    const rows = await apiFetch('/drivers')
    return (Array.isArray(rows) ? rows : []).map(mapDriver)
  },
  getAircraftTypes: async (category) => {
    const rows = await apiFetch('/fleet?type=aircraft_type')
    const list = Array.isArray(rows) ? rows : []
    return category ? list.filter((t) => t.category === category) : list
  },
  getAirports: async () => {
    const rows = await apiFetch('/fleet?type=airport')
    return Array.isArray(rows) ? rows : []
  },
  getAeroplanes: async () => {
    const rows = await apiFetch('/fleet?type=aeroplane')
    return Array.isArray(rows) ? rows : []
  },
  getAirEquipment: async () => {
    const rows = await apiFetch('/fleet?type=air_equipment')
    return Array.isArray(rows) ? rows : []
  },
  getCrew: async () => {
    const rows = await apiFetch('/fleet?type=crew')
    return Array.isArray(rows) ? rows : []
  },
  getPilotCheckIns: async () => {
    const rows = await apiFetch('/fleet?type=pilot_check_in')
    return Array.isArray(rows) ? rows : []
  },
  getRailSidings: async () => {
    const rows = await apiFetch('/fleet?type=rail_siding')
    return Array.isArray(rows) ? rows : []
  },
  getLocomotives: async () => {
    const rows = await apiFetch('/fleet?type=locomotive')
    return Array.isArray(rows) ? rows : []
  },
  getRailYards: async () => {
    const rows = await apiFetch('/fleet?type=rail_yard')
    return Array.isArray(rows) ? rows : []
  },
  getPorts: async () => {
    const rows = await apiFetch('/fleet?type=port')
    return Array.isArray(rows) ? rows : []
  },
  getCustomers: async () => {
    const rows = await apiFetch('/companies')
    return (Array.isArray(rows) ? rows : []).map((company) => ({
      id: company.id,
      name: company.name,
      contact: company.contact,
      email: company.email,
      phone: company.phone || '',
      tier: company.tier || 'Standard',
      outstanding: Number(company.outstanding) || 0,
      ownerId: company.ownerId || null,
      isEmailVerified: Boolean(company.isEmailVerified),
    }))
  },
  verifyCustomerEmail: async (userId) =>
    apiFetch(`/auth/customers/${userId}/verify-email`, { method: 'POST' }),
  resendCustomerVerify: async (userId) =>
    apiFetch(`/auth/customers/${userId}/resend-verify`, { method: 'POST' }),
  getOrders: async (status) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    const rows = await apiFetch(`/bookings${query}`)
    return (Array.isArray(rows) ? rows : []).map(mapOrder)
  },
  getInvoices: async () => {
    const rows = await apiFetch('/invoices')
    return (Array.isArray(rows) ? rows : []).map(mapInvoice)
  },
  getOpsDashboard: async () => apiFetch('/dashboard'),
  getLeads: async () => apiFetch('/leads'),
  getPricingRates: async () => apiFetch('/pricing/rates'),
  savePricingRates: async (body) => apiFetch('/pricing/rates', { method: 'PUT', body: JSON.stringify(body) }),
  getFuelLogs: async () => {
    const rows = await apiFetch('/expenses?kind=fuel')
    return Array.isArray(rows) ? rows : []
  },
  getYardFees: async () => {
    const rows = await apiFetch('/expenses?kind=yard_fee')
    return Array.isArray(rows) ? rows : []
  },
  getAirportFees: async () => {
    const rows = await apiFetch('/expenses?kind=airport_fee')
    return Array.isArray(rows) ? rows : []
  },
  getSalaries: async () => {
    const rows = await apiFetch('/expenses?kind=salary')
    return Array.isArray(rows) ? rows : []
  },
  createExpense: async (body) => apiFetch('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  createFleetAsset: async (body) => apiFetch('/fleet', { method: 'POST', body: JSON.stringify(body) }),
  getGeofences: async () => {
    const rows = await apiFetch('/geofences')
    return Array.isArray(rows) ? rows : []
  },
  createGeofence: async (body) => apiFetch('/geofences', { method: 'POST', body: JSON.stringify(body) }),
  deleteGeofence: async (id) => apiFetch(`/geofences/${id}`, { method: 'DELETE' }),
  evaluateGeofence: async ({ lat, lng }) =>
    apiFetch('/geofences/evaluate', { method: 'POST', body: JSON.stringify({ lat, lng }) }),
  getRouteOptimization: async () => {
    const snapshot = await apiFetch('/warehouse')
    return (Array.isArray(snapshot?.routes) ? snapshot.routes : []).map((route) => ({
      id: route.id,
      route: route.name || route.id,
      baselineHrs: route.baselineHrs,
      optimizedHrs: route.optimizedHrs,
      fuelSavePct: route.fuelSavePct || 0,
    }))
  },
  getWeatherAnalytics: async () => {
    const rows = await apiFetch('/weather')
    return Array.isArray(rows) ? rows : []
  },
  getMapAssets: async () => {
    const rows = await apiFetch('/drivers/locations')
    return Array.isArray(rows) ? rows : []
  },
  getFinanceSummary: async () => apiFetch('/finance'),
  getNotifications: async () => {
    const rows = await apiFetch('/notifications')
    return (Array.isArray(rows) ? rows : []).map(mapNotification)
  },
  markNotificationRead: async (id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
  dismissNotification: async (id) => apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
  inviteOperator: async (body) => apiFetch('/auth/ops/invite', { method: 'POST', body: JSON.stringify(body) }),
  resendOperatorInvite: async (userId) =>
    apiFetch(`/auth/ops/${userId}/resend-invite`, { method: 'POST' }),
  verifyOperatorEmail: async (userId) =>
    apiFetch(`/auth/ops/${userId}/verify-email`, { method: 'POST' }),
  getOperators: async () => {
    const [ops, admins] = await Promise.all([
      apiFetch('/users?role=operator&limit=100&sortBy=name:asc'),
      apiFetch('/users?role=admin&limit=100&sortBy=name:asc'),
    ])
    const rows = [...(admins.results || []), ...(ops.results || [])]
    const seen = new Set()
    return rows.filter((user) => {
      if (!user?.id || seen.has(user.id)) return false
      seen.add(user.id)
      return true
    })
  },
  setDriverApproval: async (employeeId, approvalStatus) =>
    apiFetch(`/drivers/${encodeURIComponent(employeeId)}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ approvalStatus }),
    }),
  createTrip: async (body) => apiFetch('/trips', { method: 'POST', body: JSON.stringify(body) }),
  updateTrip: async (tripId, body) => apiFetch(`/trips/${tripId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  reassignTrip: async (tripId, employeeId) =>
    apiFetch(`/trips/${tripId}/reassign`, { method: 'PATCH', body: JSON.stringify({ employeeId }) }),
  cancelTrip: async (tripId) => apiFetch(`/trips/${tripId}/cancel`, { method: 'POST' }),
  getWarehouseSnapshot: async () => apiFetch('/warehouse'),
  receiveParcel: async (parcelId) => postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/receive`),
  assignParcel: async (parcelId, employeeId, extra = {}) =>
    postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/assign`, {
      ...(employeeId ? { employeeId } : {}),
      ...extra,
    }),
  autoAssignParcels: async () => postWarehouse('/warehouse/parcels/auto-assign'),
  autoAssignRoutes: async () => postWarehouse('/warehouse/routes/auto-assign'),
  labelParcel: async (parcelId) => postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/label`),
  addParcelToBatch: async (parcelId, batchId) =>
    postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/batch`, { batchId }),
  closeBatch: async (batchId) => postWarehouse(`/warehouse/batches/${encodeURIComponent(batchId)}/close`),
  dispatchParcel: async (parcelId) => postWarehouse(`/warehouse/parcels/${encodeURIComponent(parcelId)}/dispatch`),
  createBatch: async ({ name, warehouse, destination }) =>
    postWarehouse('/warehouse/batches', { name, warehouse, destination }),
  optimizeRoute: async (routeId) => postWarehouse(`/warehouse/routes/${encodeURIComponent(routeId)}/optimize`),
  toggleZone: async (zoneId, active) =>
    postWarehouse(`/warehouse/zones/${encodeURIComponent(zoneId)}/toggle`, { active }),
}
