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
  const payload = {
    driverProfile: profile._id,
    status: 'assigned',
    cargo: warehouseParcel.cargo || 'Cargo',
    pickup: warehouseParcel.pickup || warehouseParcel.warehouse || 'Warehouse',
    dropoff: warehouseParcel.dropoff || 'Destination',
    recipientName: warehouseParcel.consignee || warehouseParcel.client || 'Consignee',
    recipientPhone: warehouseParcel.recipientPhone || profile.phone || 'TBC',
    clientName: warehouseParcel.client || warehouseParcel.shipper || '',
    clientOrderId: warehouseParcel.orderId || '',
    barcode: warehouseParcel.labelCode || warehouseParcel.code,
    weight: warehouseParcel.weightKg ? `${warehouseParcel.weightKg} kg` : warehouseParcel.weight || '',
    instructions: warehouseParcel.zone ? `Yard zone: ${warehouseParcel.zone}` : '',
  };

  const existing = await DriverParcel.findOne({ code: warehouseParcel.code });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return DriverParcel.create({
    code: warehouseParcel.code,
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

const applySuggestionToParcel = async (parcel, parcelCode) => {
  const hint = await AssignmentSuggestion.findOne({ code: parcelCode });
  if (!hint) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No assignment suggestion for this parcel');
  }

  parcel.status = 'assigned';
  parcel.fleetType = hint.fleetType;
  parcel.truck = hint.truck;
  parcel.driver = hint.driver;
  parcel.partner = hint.partner;
  parcel.driverEmployeeId = undefined;
  await parcel.save();
  await appendEvent(
    parcel.code,
    'Smart assigned',
    `${hint.fleetType === 'own' ? 'Own fleet' : hint.partner} · ${hint.truck} · ${hint.driver}`
  );

  const driver = await WarehouseDriver.findOne({ name: hint.driver });
  if (driver) {
    const assigned = new Set(driver.assignedParcels || []);
    assigned.add(parcelCode);
    driver.assignedParcels = [...assigned];
    driver.status = 'loading';
    await driver.save();
  }

  return parcel.toJSON();
};

const assignParcelToRegisteredDriver = async (parcel, parcelCode, employeeId) => {
  const profile = await DriverProfile.findOne({ employeeId }).populate('user', 'name email role');
  if (!profile || !profile.user || profile.user.role !== 'driver') {
    throw new ApiError(httpStatus.NOT_FOUND, `No registered driver with ID ${employeeId}`);
  }

  parcel.status = 'assigned';
  parcel.fleetType = 'own';
  parcel.truck = profile.assignedVehicle || parcel.truck || '—';
  parcel.driver = profile.user.name;
  parcel.driverEmployeeId = profile.employeeId;
  parcel.partner = null;
  await parcel.save();
  await syncDriverPortalParcel(parcel, profile);
  await appendEvent(
    parcel.code,
    'Smart assigned',
    `Own fleet · ${parcel.truck} · ${profile.user.name} (${profile.employeeId})`
  );

  return parcel.toJSON();
};

const assignParcel = async (parcelCode, { employeeId } = {}) => {
  await ensureSeed();
  const parcel = await Parcel.findOne({ code: parcelCode });
  if (!parcel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parcel not found');
  }

  if (employeeId) {
    return assignParcelToRegisteredDriver(parcel, parcelCode, employeeId);
  }

  return applySuggestionToParcel(parcel, parcelCode);
};

const autoAssignParcels = async () => {
  await ensureSeed();
  const hints = await AssignmentSuggestion.find();
  const updated = [];
  for (const hint of hints) {
    const parcel = await Parcel.findOne({ code: hint.parcelId || hint.code });
    if (parcel && !parcel.truck) {
      updated.push(await assignParcel(parcel.code));
    }
  }
  return updated;
};

const autoAssignRoutes = async () => {
  await ensureSeed();
  const routes = await WarehouseRoute.find({ status: 'suggested' });
  await Promise.all(
    routes.map(async (route) => {
      route.status = 'assigned';
      await route.save();
    })
  );
  return toJsonList(await WarehouseRoute.find());
};

module.exports = {
  ensureSeed,
  getSnapshot,
  listRegisteredDrivers,
  assignParcel,
  autoAssignParcels,
  autoAssignRoutes,
  labelParcel,
  addParcelToBatch,
  closeBatch,
  dispatchParcel,
};
