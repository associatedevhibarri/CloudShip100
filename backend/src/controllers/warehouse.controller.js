const catchAsync = require('../utils/catchAsync');
const warehouseService = require('../services/warehouse.service');

const getSnapshot = catchAsync(async (req, res) => {
  const snapshot = await warehouseService.getSnapshot();
  res.send(snapshot);
});

const assignParcel = catchAsync(async (req, res) => {
  const parcel = await warehouseService.assignParcel(req.params.parcelId);
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

module.exports = {
  getSnapshot,
  assignParcel,
  autoAssignParcels,
  autoAssignRoutes,
};
