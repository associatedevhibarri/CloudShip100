/* eslint-disable no-await-in-loop, no-restricted-syntax, no-param-reassign */
const mongoose = require('mongoose');
const httpStatus = require('http-status');
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
const { DriverProfile, Parcel: DriverParcel, Booking, Trip } = require('../models');
const ApiError = require('../utils/ApiError');
const bookingSyncService = require('./bookingSync.service');
const googleMapsService = require('./googleMaps.service');
const geofenceService = require('./geofence.service');

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
  if (count || !items || !items.length) return;
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
    source: 'seed',
  }));
  await insertIfEmpty(WarehouseZone, seed.warehouseZones, withCode);
  await insertIfEmpty(DispatchEvent, seed.dispatchEvents, withCode);
  await insertIfEmpty(WarehouseRoute, seed.warehouseRoutes, withCode);
  await insertIfEmpty(WarehouseDriver, seed.warehouseDrivers, withCode);
  await insertIfEmpty(WarehouseMapAsset, seed.warehouseMapAssets, (item) => {
    const mapped = withCode(item);
    if (mapped.collection) {
      mapped.collectionPoint = mapped.collection;
      delete mapped.collection;
    }
    return mapped;
  });
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

const nextBatchCode = async () => {
  const docs = await WarehouseBatch.find({ code: /^BAT-/ }).select('code');
  const max = docs.reduce((acc, doc) => Math.max(acc, numericSuffix(doc.code)), 100);
  return `BAT-${String(max + 1).padStart(3, '0')}`;
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

  const clientName = (company && company.name) || 'Customer';
  let weightKg = null;
  if (extras.weightKg != null) weightKg = extras.weightKg;
  else if (booking.weightKg != null) weightKg = booking.weightKg;

  const parcel = await Parcel.create({
    code: await nextParcelCode(),
    orderId,
    bookingId,
    cargo: booking.cargo,
    weightKg,
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
        name: (plain.user && plain.user.name) || 'Driver',
        email: (plain.user && plain.user.email) || '',
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

const scoreMatch = (parcel, driver, isPortal) => {
  let score = isPortal ? 78 : 68;
  if (driver.vehicle) score += 8;
  if (driver.yard && parcel.warehouse && driver.yard === parcel.warehouse) score += 10;
  if (driver.status === 'available') score += 5;
  if (parcel.mode === 'Road') score += 2;
  return Math.min(99, score);
};

const buildLiveSuggestions = (parcels, registeredDrivers, warehouseDrivers, seedHints) => {
  const unassigned = parcels.filter((p) => p.status !== 'expected' && p.status !== 'dispatched' && !p.fleetType && !p.truck);
  const seeded = seedHints.map((hint) => ({ ...hint, source: hint.source || 'seed' }));
  const live = [];

  unassigned.forEach((parcel, index) => {
    if (seeded.some((s) => (s.parcelId || s.id) === parcel.id)) return;

    const portal = registeredDrivers[index % Math.max(registeredDrivers.length, 1)];
    if (registeredDrivers.length && portal) {
      live.push({
        id: parcel.id,
        parcelId: parcel.id,
        reason: `Own-fleet first: portal driver ${portal.employeeId} matches ${parcel.client || 'client'} on ${
          parcel.mode || 'Road'
        }`,
        fleetType: 'own',
        truck: portal.vehicle || 'TBC',
        driver: portal.name,
        employeeId: portal.employeeId,
        partner: null,
        score: scoreMatch(parcel, { ...portal, status: 'available' }, true),
        source: 'live',
      });
      return;
    }

    const available = warehouseDrivers.find((d) => d.status === 'available') || warehouseDrivers[0];
    if (!available) return;
    live.push({
      id: parcel.id,
      parcelId: parcel.id,
      reason: `${available.fleetType === 'own' ? 'Own fleet' : available.partner} has spare capacity at ${available.yard}`,
      fleetType: available.fleetType,
      truck: available.vehicle,
      driver: available.name,
      partner: available.fleetType === 'own' ? null : available.partner,
      score: scoreMatch(parcel, available, false),
      source: 'live',
    });
  });

  return [...seeded, ...live];
};

const mergeDriverBoard = (warehouseDrivers, registeredDrivers, parcels) => {
  const assignedByEmployee = {};
  parcels.forEach((p) => {
    if (!p.driverEmployeeId) return;
    assignedByEmployee[p.driverEmployeeId] = assignedByEmployee[p.driverEmployeeId] || [];
    assignedByEmployee[p.driverEmployeeId].push(p.id);
  });

  const portalCrew = registeredDrivers.map((d) => ({
    id: d.employeeId,
    name: d.name,
    fleetType: 'own',
    partner: 'Cloud Ship own fleet',
    status: assignedByEmployee[d.employeeId] && assignedByEmployee[d.employeeId].length ? 'loading' : 'available',
    yard: 'Registered portal',
    assignedParcels: assignedByEmployee[d.employeeId] || [],
    vehicle: d.vehicle || '—',
    shift: 'Portal',
    employeeId: d.employeeId,
    email: d.email,
    source: 'portal',
  }));

  const names = new Set(portalCrew.map((d) => d.name.toLowerCase()));
  const yardCrew = warehouseDrivers.filter((d) => !names.has(String(d.name || '').toLowerCase()));
  return [...portalCrew, ...yardCrew];
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
    DispatchEvent.find().sort({ createdAt: 1 }),
    WarehouseRoute.find(),
    WarehouseDriver.find(),
    WarehouseMapAsset.find(),
    listRegisteredDrivers(),
  ]);

  const parcelJson = toJsonList(parcels);
  const driverJson = toJsonList(drivers);
  await Promise.all(
    parcelJson
      .filter((p) => p.receivedAt && p.status && p.status !== 'expected')
      .map((p) => markBookingStage(p, 'warehouse'))
  );
  return {
    kpis: computeKpis(parcelJson),
    parcels: parcelJson,
    batches: toJsonList(batches),
    suggestions: buildLiveSuggestions(parcelJson, registeredDrivers, driverJson, toJsonList(suggestions)),
    zones: toJsonList(zones),
    events: toJsonList(events),
    routes: toJsonList(routes),
    drivers: mergeDriverBoard(driverJson, registeredDrivers, parcelJson),
    registeredDrivers,
    mapAssets: toJsonList(mapAssets),
  };
};

const clockTime = () => new Date().toTimeString().slice(0, 5);

const makeLabelCode = (parcel) => {
  const obj = parcel.toObject ? parcel.toObject() : parcel;
  if (obj.labelCode) return obj.labelCode;
  const num = String(obj.code || '')
    .replace(/\D/g, '')
    .slice(-4)
    .padStart(4, '0');
  const slug =
    String(obj.cargo || 'GEN')
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

  const labelCode = makeLabelCode(parcel);
  const updated = await Parcel.findOneAndUpdate(
    { code: parcel.code },
    {
      $set: {
        labelCode,
        zone: parcel.zone || 'Staging / labelling',
        ...(parcel.status === 'received' ? { status: 'labelled' } : {}),
      },
    },
    { new: true }
  );
  await appendEvent(updated.code, 'Labelled', updated.labelCode);
  await syncDriverPortalStatus(updated, 'assigned');
  return updated.toJSON();
};

const createBatch = async ({ name, warehouse, destination }) => {
  await ensureSeed();
  const batch = await WarehouseBatch.create({
    code: await nextBatchCode(),
    name,
    warehouse,
    destination,
    parcelIds: [],
    status: 'open',
    openedAt: new Date().toISOString(),
  });
  return batch.toJSON();
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
  const updatedBatch = await WarehouseBatch.findOneAndUpdate(
    { code: batchId },
    {
      $set: {
        parcelIds: [...ids],
        status: batch.status === 'open' ? 'ready' : batch.status,
      },
    },
    { new: true }
  );

  const updated = await Parcel.findOneAndUpdate(
    { code: parcel.code },
    {
      $set: {
        batchId: updatedBatch.code,
        status: parcel.status === 'received' || parcel.status === 'labelled' ? 'labelled' : parcel.status,
      },
    },
    { new: true }
  );
  await appendEvent(updated.code, 'Batched', updatedBatch.code);
  return updated.toJSON();
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
  const updated = await WarehouseBatch.findOneAndUpdate({ code: batchId }, { $set: { status: 'ready' } }, { new: true });
  return updated.toJSON();
};

const upsertDispatchAsset = async (parcel, zone) => {
  const payload = {
    type: 'vehicle',
    label: parcel.truck || parcel.code,
    status: 'dispatched',
    lat: (zone && zone.lat) || -28.1,
    lng: (zone && zone.lng) || 29.6,
    driver: parcel.driver || '—',
    payload: `${parcel.cargo || 'Cargo'} · ${parcel.code}`,
    distance: 'En route',
    collectionPoint: parcel.warehouse || parcel.pickup || 'Yard',
    delivery: parcel.dropoff || 'Destination',
  };
  await WarehouseMapAsset.findOneAndUpdate(
    { code: `WH-MAP-${parcel.code}` },
    { $set: payload, $setOnInsert: { code: `WH-MAP-${parcel.code}` } },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

const dispatchParcel = async (parcelCode, options = {}) => {
  const parcel = await findWarehouseParcel(parcelCode);
  if (parcel.status === 'dispatched') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Parcel already dispatched');
  }
  if (!parcel.driver && !parcel.fleetType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assign a driver before dispatch');
  }

  const dispatchZones = await WarehouseZone.find({
    type: 'dispatch',
    warehouse: parcel.warehouse,
  });
  if (dispatchZones.length && dispatchZones.every((z) => !z.active)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Dispatch geofence is inactive at ${parcel.warehouse}`);
  }
  const activeZone =
    dispatchZones.find((z) => z.active) || (await WarehouseZone.findOne({ type: 'dispatch', active: true }));

  const point = await resolveDispatchPoint(parcel, options, activeZone);
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

  const updated = await Parcel.findOneAndUpdate(
    { code: parcel.code },
    { $set: { status: 'dispatched', zone: (activeZone && activeZone.name) || 'Dispatch bay' } },
    { new: true }
  );

  if (updated.batchId) {
    await WarehouseBatch.findOneAndUpdate({ code: updated.batchId }, { $set: { status: 'dispatched' } });
  }
  if (updated.driver) {
    await WarehouseDriver.findOneAndUpdate(
      { name: updated.driver },
      { $set: { status: 'on_route' }, $addToSet: { assignedParcels: updated.code } }
    );
  }

  await upsertDispatchAsset(updated, activeZone);
  await appendEvent(
    updated.code,
    'Dispatched',
    `Left ${(activeZone && activeZone.name) || 'dispatch bay'} geofence${
      updated.driverEmployeeId ? ` · ${updated.driverEmployeeId}` : ''
    }`
  );
  await syncDriverPortalStatus(updated, 'in_transit');
  await markBookingStage(updated, 'in_transit', { status: 'in_transit' });
  return updated.toJSON();
};

/**
 * Resolve GPS point for dispatch geofence checks (body → parcel → active dispatch zone)
 */
const resolveDispatchPoint = async (parcel, options = {}, activeZone = null) => {
  if (options.lat != null && options.lng != null) {
    return { lat: Number(options.lat), lng: Number(options.lng) };
  }

  const obj = typeof parcel.toObject === 'function' ? parcel.toObject() : parcel;
  if (obj.lat != null && obj.lng != null) {
    return { lat: Number(obj.lat), lng: Number(obj.lng) };
  }

  if (activeZone) {
    const z = activeZone.toObject ? activeZone.toObject() : activeZone;
    if (z.lat != null && z.lng != null) {
      return { lat: Number(z.lat), lng: Number(z.lng) };
    }
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

const applySuggestionToParcel = async (parcelCode, hintOverride) => {
  let hint = hintOverride;
  if (!hint) {
    const hintDoc = await AssignmentSuggestion.findOne({ code: parcelCode });
    if (!hintDoc) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No assignment suggestion for this parcel');
    }
    hint = hintDoc.toObject();
  }

  const updated = await Parcel.findOneAndUpdate(
    { code: parcelCode },
    {
      status: 'assigned',
      fleetType: hint.fleetType,
      truck: hint.truck,
      driver: hint.driver,
      partner: hint.partner || null,
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
    await WarehouseDriver.findOneAndUpdate(
      { code: driverDoc.code },
      { $addToSet: { assignedParcels: parcelCode }, $set: { status: 'loading' } }
    );
  }

  return updated.toJSON();
};

const assignParcelToRegisteredDriver = async (parcelCode, employeeId) => {
  const profile = await DriverProfile.findOne({ employeeId }).populate('user', 'name email role');
  if (!profile || !profile.user || profile.user.role !== 'driver') {
    throw new ApiError(httpStatus.NOT_FOUND, `No registered driver with ID ${employeeId}`);
  }

  const existing = await Parcel.findOne({ code: parcelCode });
  const existingTruck = existing ? existing.truck : null;

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
  await bookingSyncService.syncBookingFromParcelStatus(updated.orderId, 'assigned');
  await appendEvent(
    parcelCode,
    'Smart assigned',
    `Own fleet · ${updated.truck} · ${profile.user.name} (${profile.employeeId})`
  );

  return updated.toJSON();
};

const assignParcel = async (parcelCode, { employeeId, fleetType, truck, driver, partner } = {}) => {
  await ensureSeed();
  const parcel = await Parcel.findOne({ code: parcelCode });
  if (!parcel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parcel not found');
  }
  assertReceived(parcel);

  if (employeeId) {
    return assignParcelToRegisteredDriver(parcelCode, employeeId);
  }

  if (truck || driver) {
    return applySuggestionToParcel(parcelCode, { fleetType, truck, driver, partner });
  }

  return applySuggestionToParcel(parcelCode);
};

const autoAssignParcels = async () => {
  await ensureSeed();
  const registered = await listRegisteredDrivers();
  const open = await Parcel.find({
    status: { $nin: ['expected', 'dispatched'] },
    $or: [{ truck: null }, { truck: '' }, { truck: { $exists: false } }],
  });
  const crew = await WarehouseDriver.find({ status: 'available' });
  const updated = [];
  let driverIndex = 0;

  for (const parcel of open) {
    if (registered.length) {
      const driver = registered[driverIndex % registered.length];
      driverIndex += 1;
      updated.push(await assignParcel(parcel.code, { employeeId: driver.employeeId }));
    } else {
      const hintDoc = await AssignmentSuggestion.findOne({ code: parcel.code });
      if (hintDoc) {
        updated.push(await assignParcel(parcel.code));
      } else {
        const match = crew.find((d) => d.yard === parcel.warehouse) || crew[driverIndex % Math.max(crew.length, 1)];
        if (match) {
          driverIndex += 1;
          updated.push(
            await applySuggestionToParcel(parcel.code, {
              fleetType: match.fleetType,
              truck: match.vehicle,
              driver: match.name,
              partner: match.fleetType === 'own' ? null : match.partner,
            })
          );
        }
      }
    }
  }
  return updated;
};

const applyOptimizedHours = (baselineHrs, durationMinutes) => {
  const hours = Math.round((durationMinutes / 60) * 10) / 10;
  const baseline = baselineHrs || hours;
  const fuelSavePct = baseline > 0 ? Math.max(0, Math.round(((baseline - hours) / baseline) * 100)) : 0;
  return { optimizedHrs: hours, fuelSavePct };
};

const optimizeRoute = async (routeCode) => {
  await ensureSeed();
  const route = await WarehouseRoute.findOne({ code: routeCode });
  if (!route) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Route not found');
  }

  const stops = route.stops || [];
  if (stops.length < 2) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Route needs at least an origin and a destination stop');
  }

  if (route.optimized) {
    return route.toJSON();
  }

  const waypoints = stops.slice(1, -1);
  const update = { status: 'assigned', optimized: true };

  try {
    const result = await googleMapsService.getRoute({
      origin: stops[0],
      destination: stops[stops.length - 1],
      waypoints,
    });
    update.distanceKm = result.distanceKm;
    update.durationMinutes = result.durationMinutes;
    Object.assign(update, applyOptimizedHours(route.baselineHrs, result.durationMinutes));
    if (result.waypointOrder.length === waypoints.length) {
      update.stops = [stops[0], ...result.waypointOrder.map((i) => waypoints[i]), stops[stops.length - 1]];
    }
  } catch (err) {
    if (err.statusCode !== httpStatus.SERVICE_UNAVAILABLE && err.statusCode !== httpStatus.BAD_GATEWAY) {
      throw err;
    }
    const baseline = route.baselineHrs || stops.length * 4;
    update.optimizedHrs = Math.round(baseline * 0.85 * 10) / 10;
    update.fuelSavePct = 15;
  }

  const updated = await WarehouseRoute.findOneAndUpdate({ code: routeCode }, { $set: update }, { new: true });
  return updated.toJSON();
};

const attachParcelsToRoute = async (route) => {
  const stops = route.stops || [];
  const lastStop = String(stops[stops.length - 1] || '')
    .split(',')[0]
    .trim();
  if (!lastStop) return route.parcelIds || [];
  const candidates = await Parcel.find({ status: { $nin: ['expected', 'dispatched'] } }).select('code dropoff');
  const needle = lastStop.toLowerCase();
  const extras = candidates.filter((p) =>
    String(p.dropoff || '')
      .toLowerCase()
      .includes(needle)
  );
  return [...new Set([...(route.parcelIds || []), ...extras.map((p) => p.code)])];
};

const autoAssignRoutes = async () => {
  await ensureSeed();
  const routes = await WarehouseRoute.find({ status: { $in: ['suggested', 'assigned'] } });
  for (const route of routes) {
    if (route.status === 'suggested') {
      await optimizeRoute(route.code);
    }
    const parcelIds = await attachParcelsToRoute(route);
    await WarehouseRoute.findOneAndUpdate({ code: route.code }, { $set: { parcelIds, status: 'assigned' } });
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

const toggleZone = async (zoneId, active) => {
  await ensureSeed();
  const zone = await WarehouseZone.findOne({ code: zoneId });
  if (!zone) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Zone not found');
  }
  const updated = await WarehouseZone.findOneAndUpdate({ code: zoneId }, { $set: { active } }, { new: true });
  return updated.toJSON();
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
  createBatch,
  addParcelToBatch,
  closeBatch,
  dispatchParcel,
  evaluateZones,
  toggleZone,
};
