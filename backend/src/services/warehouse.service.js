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
const { DriverProfile, Parcel: DriverParcel } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const bookingSyncService = require('./bookingSync.service');
const googleMapsService = require('./googleMaps.service');

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

const ensureSeed = async () => {
  const count = await Parcel.countDocuments();
  if (count) return;

  await Promise.all([
    Parcel.insertMany(seed.parcels.map(withCode)),
    WarehouseBatch.insertMany(seed.batches.map(withCode)),
    AssignmentSuggestion.insertMany(
      seed.assignmentSuggestions.map((s) => ({
        code: s.parcelId,
        ...s,
      }))
    ),
    WarehouseZone.insertMany(seed.warehouseZones.map(withCode)),
    DispatchEvent.insertMany(seed.dispatchEvents.map(withCode)),
    WarehouseRoute.insertMany(seed.warehouseRoutes.map(withCode)),
    WarehouseDriver.insertMany(seed.warehouseDrivers.map(withCode)),
    WarehouseMapAsset.insertMany(seed.warehouseMapAssets.map(withCode)),
  ]);
};

const toJsonList = (docs) => docs.map((d) => d.toJSON());

const computeKpis = (parcels) => {
  const inboundToday = parcels.length;
  const labelled = parcels.filter((p) => p.labelCode).length;
  const awaitingAssign = parcels.filter((p) => !p.fleetType).length;
  const dispatched = parcels.filter((p) => p.status === 'dispatched').length;
  const assigned = parcels.filter((p) => p.fleetType);
  const own = assigned.filter((p) => p.fleetType === 'own').length;
  const ownFleetShare = assigned.length ? Math.round((own / assigned.length) * 100) : 0;
  return {
    inboundToday,
    labelled,
    awaitingAssign,
    dispatched,
    ownFleetShare,
    partnerShare: assigned.length ? 100 - ownFleetShare : 0,
  };
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

const syncDriverPortalParcel = async (warehouseParcel, profile) => {
  const wp = warehouseParcel.toObject ? warehouseParcel.toObject() : warehouseParcel;
  const payload = {
    driverProfile: profile._id,
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
  const num = String(parcel.code || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
  const slug = String(parcel.cargo || 'GEN')
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
};

const labelParcel = async (parcelCode) => {
  const parcel = await findWarehouseParcel(parcelCode);
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

const dispatchParcel = async (parcelCode) => {
  const parcel = await findWarehouseParcel(parcelCode);
  if (parcel.status === 'dispatched') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Parcel already dispatched');
  }
  if (!parcel.driver && !parcel.fleetType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assign a driver before dispatch');
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
  return parcel.toJSON();
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
    await WarehouseDriver.findOneAndUpdate(
      { code: driverDoc.code },
      { assignedParcels: [...assigned], status: 'loading' }
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

module.exports = {
  ensureSeed,
  getSnapshot,
  listRegisteredDrivers,
  assignParcel,
  autoAssignParcels,
  optimizeRoute,
  autoAssignRoutes,
  labelParcel,
  addParcelToBatch,
  closeBatch,
  dispatchParcel,
};
