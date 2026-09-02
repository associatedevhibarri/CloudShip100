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

const getSnapshot = async () => {
  await ensureSeed();
  const [parcels, batches, suggestions, zones, events, routes, drivers, mapAssets] = await Promise.all([
    Parcel.find(),
    WarehouseBatch.find(),
    AssignmentSuggestion.find(),
    WarehouseZone.find(),
    DispatchEvent.find(),
    WarehouseRoute.find(),
    WarehouseDriver.find(),
    WarehouseMapAsset.find(),
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
    mapAssets: toJsonList(mapAssets),
  };
};

const assignParcel = async (parcelCode) => {
  await ensureSeed();
  const parcel = await Parcel.findOne({ code: parcelCode });
  if (!parcel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parcel not found');
  }
  const hint = await AssignmentSuggestion.findOne({ code: parcelCode });
  if (!hint) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No assignment suggestion for this parcel');
  }

  parcel.status = 'assigned';
  parcel.fleetType = hint.fleetType;
  parcel.truck = hint.truck;
  parcel.driver = hint.driver;
  parcel.partner = hint.partner;
  await parcel.save();

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
  assignParcel,
  autoAssignParcels,
  autoAssignRoutes,
};
