const catchAsync = require('../utils/catchAsync');
const warehouseService = require('../services/warehouse.service');

const getSnapshot = catchAsync(async (req, res) => {
  const snapshot = await warehouseService.getSnapshot();
  res.send(snapshot);
});

const listRegisteredDrivers = catchAsync(async (req, res) => {
  const drivers = await warehouseService.listRegisteredDrivers();
  res.send({ drivers });
});

const assignParcel = catchAsync(async (req, res) => {
  const parcel = await warehouseService.assignParcel(req.params.parcelId, req.body);
  res.send(parcel);
});

const autoAssignParcels = catchAsync(async (req, res) => {
  const parcels = await warehouseService.autoAssignParcels();
  res.send({ parcels });
});

const autoAssignRoutes = catchAsync(async (req, res) => {
  const routes = await warehouseService.autoAssignRoutes();
  res.send({ routes });
});

const labelParcel = catchAsync(async (req, res) => {
  const parcel = await warehouseService.labelParcel(req.params.parcelId);
  res.send(parcel);
});

const addParcelToBatch = catchAsync(async (req, res) => {
  const parcel = await warehouseService.addParcelToBatch(req.params.parcelId, req.body.batchId);
  res.send(parcel);
});

const closeBatch = catchAsync(async (req, res) => {
  const batch = await warehouseService.closeBatch(req.params.batchId);
  res.send(batch);
});

const dispatchParcel = catchAsync(async (req, res) => {
  const parcel = await warehouseService.dispatchParcel(req.params.parcelId, req.body || {});
  res.send(parcel);
});

const receiveParcel = catchAsync(async (req, res) => {
  const parcel = await warehouseService.receiveParcel(req.params.parcelId);
  res.send(parcel);
});

const optimizeRoute = catchAsync(async (req, res) => {
  const route = await warehouseService.optimizeRoute(req.params.routeId);
  res.send(route);
});

const evaluateZones = catchAsync(async (req, res) => {
  const result = await warehouseService.evaluateZones(req.body);
  res.send(result);
});

const createBatch = catchAsync(async (req, res) => {
  const batch = await warehouseService.createBatch(req.body);
  res.status(201).send(batch);
});

const toggleZone = catchAsync(async (req, res) => {
  const zone = await warehouseService.toggleZone(req.params.zoneId, req.body.active);
  res.send(zone);
});

module.exports = {
  getSnapshot,
  listRegisteredDrivers,
  assignParcel,
  autoAssignParcels,
  autoAssignRoutes,
  receiveParcel,
  labelParcel,
  createBatch,
  addParcelToBatch,
  closeBatch,
  dispatchParcel,
  optimizeRoute,
  evaluateZones,
  toggleZone,
};
