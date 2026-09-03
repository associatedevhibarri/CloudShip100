const seed = require('../seed/warehouse.seed.json');
const {
  Parcel,
  WarehouseBatch,
  AssignmentSuggestion,
  WarehouseZone,
  DispatchEvent,
  WarehouseRoute,
  WarehouseDriver,
  WarehouseMapAsset,
} = require('../models/warehouse.model');
const mongoose = require('mongoose');
const { DriverProfile, Parcel: DriverParcel, Booking, Trip } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const bookingSyncService = require('./bookingSync.service');
const googleMapsService = require('./googleMaps.service');
const geofenceService = require('./geofence.service');

// NOTE: these warehouse models declare only `code` as a real schema path (`strict: false`
// for everything else). Mongoose does NOT expose undeclared paths via plain dot-notation
// get/set on a document fetched from the DB — only `.get(path)`/`.toObject()` for reads,
// and `Model.findOneAndUpdate` (or `.set(path, value)`) for writes actually persist. Plain
// `doc.someField = x; await doc.save()` silently no-ops for any field other than `code`.

const withCode = (item) => {
  const { id, createdAt, ...rest } = item;
  return {
    code: id,
    ...rest,
    ...(createdAt ? { openedAt: createdAt } : {}),
  };
};

const insertIfEmpty = async (Model, items, mapFn) => {
  const count = await Model.countDocuments();
  if (count || !items?.length) return;
  try {
    await Model.insertMany(items.map(mapFn), { ordered: false });
  } catch (err) {
    if (err.code !== 11000 && !err.writeErrors) throw err;
  }
};

const ensureSeed = async () => {
  await insertIfEmpty(Parcel, seed.parcels, withCode);
  await insertIfEmpty(WarehouseBatch, seed.batches, withCode);
  await insertIfEmpty(AssignmentSuggestion, seed.assignmentSuggestions, (s) => ({
    code: s.parcelId,
    ...s,
  }));
  await insertIfEmpty(WarehouseZone, seed.warehouseZones, withCode);
  await insertIfEmpty(DispatchEvent, seed.dispatchEvents, withCode);
  await insertIfEmpty(WarehouseRoute, seed.warehouseRoutes, withCode);
  await insertIfEmpty(WarehouseDriver, seed.warehouseDrivers, withCode);
  await insertIfEmpty(WarehouseMapAsset, seed.warehouseMapAssets, withCode);
};

const toJsonList = (docs) => docs.map((d) => d.toJSON());

const isSameDay = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const n = new Date();
  return d.toDateString() === n.toDateString();
};

const computeKpis = (parcels) => {
  const awaitingReceive = parcels.filter((p) => p.status === 'expected').length;
  const inboundToday = parcels.filter((p) => p.status !== 'expected' && isSameDay(p.receivedAt)).length;
  const labelled = parcels.filter((p) => p.labelCode).length;
  const awaitingAssign = parcels.filter((p) => !p.fleetType && p.status !== 'expected' && p.status !== 'dispatched').length;
  const dispatched = parcels.filter((p) => p.status === 'dispatched').length;
  const assigned = parcels.filter((p) => p.fleetType);
  const own = assigned.filter((p) => p.fleetType === 'own').length;
  const ownFleetShare = assigned.length ? Math.round((own / assigned.length) * 100) : 0;
  return {
    awaitingReceive,
    inboundToday,
    labelled,
    awaitingAssign,
    dispatched,
    ownFleetShare,
    partnerShare: assigned.length ? 100 - ownFleetShare : 0,
  };
};

const numericSuffix = (value) => {
  const n = parseInt(String(value || '').replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

const nextParcelCode = async () => {
  const docs = await Parcel.find({ code: /^PCL-/ }).select('code');
  const max = docs.reduce((acc, doc) => Math.max(acc, numericSuffix(doc.code)), 1000);
  return `PCL-${max + 1}`;
};

const ensureExpectedParcels = async () => {
  const expected = (seed.parcels || []).filter((p) => p.status === 'expected');
  await Promise.all(
    expected.map(async (item) => {
      const exists = await Parcel.findOne({ code: item.id });
      if (!exists) {
        await Parcel.create(withCode(item));
      }
    })
  );
};

const findBookingForParcel = async (parcel) => {
  if (parcel.bookingId && mongoose.Types.ObjectId.isValid(parcel.bookingId)) {
    const byId = await Booking.findById(parcel.bookingId);
    if (byId) return byId;
  }
  if (parcel.orderId) {
    return Booking.findOne({ code: parcel.orderId });
  }
  return null;
};

const markBookingStage = async (parcel, stage, extra = {}) => {
  const booking = await findBookingForParcel(parcel);
  if (!booking) return;
  const step = booking.timeline.find((item) => item.stage === stage);
  if (!step || (step.done && !Object.keys(extra).length)) return;
  booking.timeline.forEach((item) => {
    if (item.stage === stage) {
      item.done = true;
      item.timestamp = new Date();
    }
  });
  Object.assign(booking, extra);
  booking.markModified('timeline');
  await booking.save();
};

const ingestBooking = async (booking, company, extras = {}) => {
  const orderId = booking.code || booking.id;
  const bookingId = String(booking.id || booking._id);
  const existing = await Parcel.findOne({
    $or: [{ orderId }, { bookingId }],
  });
  if (existing) return existing.toJSON();

  const clientName = company?.name || 'Customer';
  const parcel = await Parcel.create({
    code: await nextParcelCode(),
    orderId,
    bookingId,
    cargo: booking.cargo,
    weightKg: extras.weightKg ?? booking.weightKg ?? null,
    shipper: clientName,
    consignee: booking.dropoff,
    client: clientName,
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    warehouse: 'Durban Central Yard',
    zone: 'Inbound expected',
    batchId: null,
    labelCode: null,
    status: 'expected',
    fleetType: null,
    truck: null,
    driver: null,
    partner: null,
    mode: booking.mode || 'Road',
    receivedAt: null,
  });
  return parcel.toJSON();
};

const syncExpectedFromBookings = async () => {
  const bookings = await Booking.find({ status: { $in: ['pending', 'in_transit'] } }).populate('company');
  await Promise.all(bookings.map((booking) => ingestBooking(booking, booking.company)));
};

const listRegisteredDrivers = async () => {
  const profiles = await DriverProfile.find().populate('user', 'name email role');
  return profiles
    .filter((profile) => profile.employeeId && profile.user && profile.user.role === 'driver')
    .map((profile) => {
      const plain = profile.toJSON();
      return {
        employeeId: plain.employeeId,
        name: plain.user?.name || 'Driver',
        email: plain.user?.email || '',
        vehicle: plain.assignedVehicle || '',
        phone: plain.phone || '',
      };
    });
};

const toTripMode = (mode) => {
  const value = String(mode || 'road').toLowerCase();
  return ['road', 'air', 'maritime', 'rail'].includes(value) ? value : 'road';
};

const nextTripCode = async (profileId) => {
  const count = await Trip.countDocuments({ driverProfile: profileId });
  return `TRP-${String(count + 1).padStart(4, '0')}`;
};

const syncDriverPortalTrip = async (warehouseParcel, profile) => {
  const wp = warehouseParcel.toObject ? warehouseParcel.toObject() : warehouseParcel;
  const orderId = wp.orderId || '';
  const pickup = wp.pickup || wp.warehouse || 'Warehouse';
  const dropoff = wp.dropoff || 'Destination';

  let trip = orderId ? await Trip.findOne({ driverProfile: profile._id, clientOrderId: orderId }) : null;
  if (!trip) {
    trip = await Trip.findOne({
      driverProfile: profile._id,
      pickup,
      dropoff,
      status: { $in: ['starting_soon', 'in_progress'] },
    });
  }
  if (trip) return trip;

  const booking = orderId ? await Booking.findOne({ code: orderId }) : null;
  return Trip.create({
    code: await nextTripCode(profile._id),
    driverProfile: profile._id,
    vehicle: profile.assignedVehicle || wp.truck || '',
    cargo: wp.cargo || 'Cargo',
    pickup,
    dropoff,
    status: 'starting_soon',
    distanceKm: booking?.distanceKm || 0,
    eta: booking?.durationMinutes ? new Date(Date.now() + booking.durationMinutes * 60000) : undefined,
    startAt: new Date(),
    mode: toTripMode(wp.mode || booking?.mode),
    clientOrderId: orderId,
  });
};

const syncDriverPortalParcel = async (warehouseParcel, profile) => {
  const wp = warehouseParcel.toObject ? warehouseParcel.toObject() : warehouseParcel;
  if (!profile.assignedVehicle && wp.truck && wp.truck !== '—') {
    profile.assignedVehicle = wp.truck;
    await profile.save();
  }

  const trip = await syncDriverPortalTrip(warehouseParcel, profile);
  const payload = {
    driverProfile: profile._id,
    trip: trip.id,
    status: 'assigned',
    cargo: wp.cargo || 'Cargo',
    pickup: wp.pickup || wp.warehouse || 'Warehouse',
    dropoff: wp.dropoff || 'Destination',
    recipientName: wp.consignee || wp.client || 'Consignee',
    recipientPhone: wp.recipientPhone || profile.phone || 'TBC',
    clientName: wp.client || wp.shipper || '',
    clientOrderId: wp.orderId || '',
    barcode: wp.labelCode || wp.code,
    weight: wp.weightKg ? `${wp.weightKg} kg` : wp.weight || '',
    instructions: wp.zone ? `Yard zone: ${wp.zone}` : '',
  };

  const existing = await DriverParcel.findOne({ code: wp.code });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return DriverParcel.create({
    code: wp.code,
    ...payload,
  });
};

const getSnapshot = async () => {
  await ensureSeed();
  await ensureExpectedParcels();
  await syncExpectedFromBookings();
  const [parcels, batches, suggestions, zones, events, routes, drivers, mapAssets, registeredDrivers] = await Promise.all([
    Parcel.find(),
    WarehouseBatch.find(),
    AssignmentSuggestion.find(),
    WarehouseZone.find(),
    DispatchEvent.find(),
    WarehouseRoute.find(),
    WarehouseDriver.find(),
    WarehouseMapAsset.find(),
    listRegisteredDrivers(),
  ]);

  const parcelJson = toJsonList(parcels);
  await Promise.all(
    parcelJson
      .filter((p) => p.receivedAt && p.status && p.status !== 'expected')
      .map((p) => markBookingStage(p, 'warehouse'))
  );
  return {
    kpis: computeKpis(parcelJson),
    parcels: parcelJson,
    batches: toJsonList(batches),
    suggestions: toJsonList(suggestions),
    zones: toJsonList(zones),
    events: toJsonList(events),
    routes: toJsonList(routes),
    drivers: toJsonList(drivers),
    registeredDrivers,
    mapAssets: toJsonList(mapAssets),
  };
};

const clockTime = () => new Date().toTimeString().slice(0, 5);

const makeLabelCode = (parcel) => {
  if (parcel.labelCode) return parcel.labelCode;
  const num = String(parcel.code || '')
    .replace(/\D/g, '')
    .slice(-4)
    .padStart(4, '0');
  const slug =
    String(parcel.cargo || 'GEN')
      .split(/[\s—-]/)[0]
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 5)
      .toUpperCase() || 'GEN';
  return `CS-ZA-${num}-${slug}`;
};

const appendEvent = async (parcelId, title, detail) => {
  await DispatchEvent.create({
    code: `EVT-${Date.now().toString(36)}`,
    parcelId,
    time: clockTime(),
    title,
    detail,
  });
};

const findWarehouseParcel = async (parcelCode) => {
  await ensureSeed();
  await ensureExpectedParcels();
  const parcel = await Parcel.findOne({ code: parcelCode });
  if (!parcel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parcel not found');
  }
  return parcel;
};

const syncDriverPortalStatus = async (parcel, status) => {
  if (!parcel.driverEmployeeId && !parcel.code) return;
  const existing = await DriverParcel.findOne({ code: parcel.code });
  if (!existing) return;
  existing.status = status;
  if (parcel.labelCode) existing.barcode = parcel.labelCode;
  await existing.save();

  if (!existing.trip) return;
  const trip = await Trip.findById(existing.trip);
  if (!trip || trip.status === 'completed') return;
  if (status === 'in_transit' || status === 'picked_up') {
    trip.status = 'in_progress';
    trip.startAt = trip.startAt || new Date();
    await trip.save();
  }
  if (status === 'delivered') {
    const remaining = await DriverParcel.countDocuments({
      trip: trip.id,
      _id: { $ne: existing.id },
      status: { $ne: 'delivered' },
    });
    if (remaining === 0) {
      trip.status = 'completed';
      trip.endAt = new Date();
      await trip.save();
    }
  }
};

const receiveParcel = async (parcelCode) => {
  const parcel = await findWarehouseParcel(parcelCode);
  if (parcel.status === 'received') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order already received at the dock');
  }
  if (parcel.status && parcel.status !== 'expected') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Parcel is already past receiving');
  }

  const updated = await Parcel.findOneAndUpdate(
    { code: parcel.code },
    {
      $set: {
        status: 'received',
        zone: 'Receiving dock',
        receivedAt: new Date().toISOString(),
      },
    },
    { new: true }
  );

  await appendEvent(
    updated.code,
    'Received at warehouse',
    `${updated.warehouse || 'Yard'} — receiving dock${updated.orderId ? ` · ${updated.orderId}` : ''}`
  );
  await markBookingStage(updated, 'warehouse');
  return updated.toJSON();
};

const assertReceived = (parcel) => {
  if (parcel.status === 'expected') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Receive the order at the dock before this action');
  }
};

const labelParcel = async (parcelCode) => {
  const parcel = await findWarehouseParcel(parcelCode);
  assertReceived(parcel);
  if (parcel.status === 'dispatched') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Dispatched parcels cannot be relabelled');
  }

  parcel.labelCode = makeLabelCode(parcel);
  parcel.zone = parcel.zone || 'Staging / labelling';
  if (parcel.status === 'received') {
    parcel.status = 'labelled';
  }
  await parcel.save();
  await appendEvent(parcel.code, 'Labelled', parcel.labelCode);
  await syncDriverPortalStatus(parcel, 'assigned');
  return parcel.toJSON();
};

const addParcelToBatch = async (parcelCode, batchId) => {
  const parcel = await findWarehouseParcel(parcelCode);
  assertReceived(parcel);
  const batch = await WarehouseBatch.findOne({ code: batchId });
  if (!batch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Batch not found');
  }
  if (batch.status === 'dispatched') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot add parcels to a dispatched batch');
  }

  const ids = new Set(batch.parcelIds || []);
  ids.add(parcel.code);
  batch.parcelIds = [...ids];
  if (batch.status === 'open') {
    batch.status = 'ready';
  }
  await batch.save();

  parcel.batchId = batch.code;
  if (parcel.status === 'received' || parcel.status === 'labelled') {
    parcel.status = 'labelled';
  }
  await parcel.save();
  await appendEvent(parcel.code, 'Batched', batch.code);
  return parcel.toJSON();
};

const closeBatch = async (batchId) => {
  await ensureSeed();
  const batch = await WarehouseBatch.findOne({ code: batchId });
  if (!batch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Batch not found');
  }
  if (batch.status === 'dispatched') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Batch already dispatched');
  }
  batch.status = 'ready';
  await batch.save();
  return batch.toJSON();
};

const dispatchParcel = async (parcelCode, options = {}) => {
  const parcel = await findWarehouseParcel(parcelCode);
  if (parcel.status === 'dispatched') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Parcel already dispatched');
  }
  if (!parcel.driver && !parcel.fleetType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assign a driver before dispatch');
  }

  const point = await resolveDispatchPoint(parcel, options);
  if (point) {
    const evaluation = await geofenceService.evaluatePoint(point);
    if (!evaluation.allowed) {
      const reasons = (evaluation.exceptions || [])
        .map((e) => e.exclusion)
        .filter(Boolean)
        .join('; ');
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Dispatch blocked by geomapping exclusions at ${point.lat}, ${point.lng}${
          reasons ? `: ${reasons}` : ''
        }`
      );
    }
  }

  parcel.status = 'dispatched';
  parcel.zone = 'Dispatch bay';
  await parcel.save();
  await appendEvent(
    parcel.code,
    'Dispatched',
    `Left dispatch bay geofence${parcel.driverEmployeeId ? ` · ${parcel.driverEmployeeId}` : ''}`
  );
  await syncDriverPortalStatus(parcel, 'in_transit');
  await markBookingStage(parcel, 'in_transit', { status: 'in_transit' });
  return parcel.toJSON();
};

/**
 * Resolve GPS point for dispatch geofence checks (body → parcel → warehouse dispatch zone)
 */
const resolveDispatchPoint = async (parcel, options = {}) => {
  if (options.lat != null && options.lng != null) {
    return { lat: Number(options.lat), lng: Number(options.lng) };
  }

  const obj = typeof parcel.toObject === 'function' ? parcel.toObject() : parcel;
  if (obj.lat != null && obj.lng != null) {
    return { lat: Number(obj.lat), lng: Number(obj.lng) };
  }

  const warehouseName = obj.warehouse;
  let zone = null;
  if (warehouseName) {
    zone = await WarehouseZone.findOne({ type: 'dispatch', warehouse: warehouseName, active: true });
  }
  if (!zone) {
    zone = await WarehouseZone.findOne({ type: 'dispatch', active: true });
  }
  if (zone) {
    const z = zone.toObject ? zone.toObject() : zone;
    if (z.lat != null && z.lng != null) {
      return { lat: Number(z.lat), lng: Number(z.lng) };
    }
  }
  return null;
};

const applySuggestionToParcel = async (parcelCode) => {
  const hintDoc = await AssignmentSuggestion.findOne({ code: parcelCode });
  if (!hintDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No assignment suggestion for this parcel');
  }
  const hint = hintDoc.toObject();

  const updated = await Parcel.findOneAndUpdate(
    { code: parcelCode },
    {
      status: 'assigned',
      fleetType: hint.fleetType,
      truck: hint.truck,
      driver: hint.driver,
      partner: hint.partner,
      $unset: { driverEmployeeId: '' },
    },
    { new: true }
  );

  await appendEvent(
    parcelCode,
    'Smart assigned',
    `${hint.fleetType === 'own' ? 'Own fleet' : hint.partner} · ${hint.truck} · ${hint.driver}`
  );

  const driverDoc = await WarehouseDriver.findOne({ name: hint.driver });
  if (driverDoc) {
    const driverData = driverDoc.toObject();
    const assigned = new Set(driverData.assignedParcels || []);
    assigned.add(parcelCode);
    await WarehouseDriver.findOneAndUpdate({ code: driverDoc.code }, { assignedParcels: [...assigned], status: 'loading' });
  }

  return updated.toJSON();
};

const assignParcelToRegisteredDriver = async (parcelCode, employeeId) => {
  const profile = await DriverProfile.findOne({ employeeId }).populate('user', 'name email role');
  if (!profile || !profile.user || profile.user.role !== 'driver') {
    throw new ApiError(httpStatus.NOT_FOUND, `No registered driver with ID ${employeeId}`);
  }

  const existing = await Parcel.findOne({ code: parcelCode });
  const existingTruck = existing ? existing.get('truck') : null;

  const updated = await Parcel.findOneAndUpdate(
    { code: parcelCode },
    {
      status: 'assigned',
      fleetType: 'own',
      truck: profile.assignedVehicle || existingTruck || '—',
      driver: profile.user.name,
      driverEmployeeId: profile.employeeId,
      partner: null,
    },
    { new: true }
  );

  await syncDriverPortalParcel(updated, profile);
  await bookingSyncService.syncBookingFromParcelStatus(updated.get('orderId'), 'assigned');
  await appendEvent(
    parcelCode,
    'Smart assigned',
    `Own fleet · ${updated.get('truck')} · ${profile.user.name} (${profile.employeeId})`
  );

  return updated.toJSON();
};

const assignParcel = async (parcelCode, { employeeId } = {}) => {
  await ensureSeed();
  const parcel = await Parcel.findOne({ code: parcelCode });
  if (!parcel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parcel not found');
  }
  assertReceived(parcel);

  if (employeeId) {
    return assignParcelToRegisteredDriver(parcelCode, employeeId);
  }

  return applySuggestionToParcel(parcelCode);
};

const autoAssignParcels = async () => {
  await ensureSeed();
  const hints = await AssignmentSuggestion.find();
  const updated = [];
  for (const hint of hints) {
    const parcelCode = hint.get('parcelId') || hint.code;
    const parcel = await Parcel.findOne({ code: parcelCode });
    if (parcel && !parcel.get('truck')) {
      updated.push(await assignParcel(parcelCode));
    }
  }
  return updated;
};

const optimizeRoute = async (routeCode) => {
  await ensureSeed();
  const route = await WarehouseRoute.findOne({ code: routeCode });
  if (!route) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Route not found');
  }

  const stops = route.get('stops') || [];
  if (stops.length < 2) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Route needs at least an origin and a destination stop');
  }

  const waypoints = stops.slice(1, -1);
  const result = await googleMapsService.getRoute({
    origin: stops[0],
    destination: stops[stops.length - 1],
    waypoints,
  });

  const update = {
    distanceKm: result.distanceKm,
    durationMinutes: result.durationMinutes,
    status: 'assigned',
  };
  if (result.waypointOrder.length === waypoints.length) {
    update.stops = [stops[0], ...result.waypointOrder.map((i) => waypoints[i]), stops[stops.length - 1]];
  }

  const updated = await WarehouseRoute.findOneAndUpdate({ code: routeCode }, update, { new: true });
  return updated.toJSON();
};

const autoAssignRoutes = async () => {
  await ensureSeed();
  const routes = await WarehouseRoute.find({ status: 'suggested' });
  for (const route of routes) {
    await optimizeRoute(route.code);
  }
  return toJsonList(await WarehouseRoute.find());
};

const EARTH_RADIUS_M = 6371000;

const haversineM = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

/**
 * Evaluate a GPS point against warehouse zone radius + exclusion rules
 * @param {{ lat: number, lng: number }} point
 */
const evaluateZones = async ({ lat, lng }) => {
  await ensureSeed();
  const zones = await WarehouseZone.find({ active: true });
  const matched = [];
  const exclusions = new Set();

  for (const zone of zones) {
    const json = zone.toJSON();
    if (zone.lat == null || zone.lng == null) continue;
    const distanceM = haversineM(lat, lng, zone.lat, zone.lng);
    const radiusM = zone.radiusM == null ? 5000 : zone.radiusM;
    if (distanceM <= radiusM) {
      matched.push({
        ...json,
        distanceM: Math.round(distanceM),
        inside: true,
      });
      (zone.exclusions || []).forEach((e) => exclusions.add(e));
    }
  }

  const exclusionList = [...exclusions];
  return {
    lat,
    lng,
    matchedZones: matched,
    exclusions: exclusionList,
    allowed: exclusionList.length === 0,
  };
};

module.exports = {
  ensureSeed,
  ingestBooking,
  getSnapshot,
  listRegisteredDrivers,
  assignParcel,
  autoAssignParcels,
  optimizeRoute,
  autoAssignRoutes,
  receiveParcel,
  labelParcel,
  addParcelToBatch,
  closeBatch,
  dispatchParcel,
  evaluateZones,
};
