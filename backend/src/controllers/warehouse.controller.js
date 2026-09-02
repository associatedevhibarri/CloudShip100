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
  const parcel = await warehouseService.dispatchParcel(req.params.parcelId);
  res.send(parcel);
});

module.exports = {
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
