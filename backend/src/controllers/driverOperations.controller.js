const catchAsync = require('../utils/catchAsync');
const { driverOperationsService } = require('../services');

const getMyTrips = catchAsync(async (req, res) => {
  const trips = await driverOperationsService.getMyTrips(req.user, req.query.bucket);
  res.send(trips);
});

const getMyParcels = catchAsync(async (req, res) => {
  const parcels = await driverOperationsService.getMyParcels(req.user, req.query.status);
  res.send(parcels);
});

const updateParcelStatus = catchAsync(async (req, res) => {
  const parcel = await driverOperationsService.updateMyParcelStatus(
    req.user,
    req.params.parcelCode,
    req.body.status
  );
  res.send(parcel);
});

const getMyDamageLogs = catchAsync(async (req, res) => {
  const logs = await driverOperationsService.getMyDamageLogs(req.user);
  res.send(logs);
});

const createDamageLog = catchAsync(async (req, res) => {
  const log = await driverOperationsService.createDamageLog(req.user, req.body, req.file);
  res.status(201).send(log);
});

const getMyHistory = catchAsync(async (req, res) => {
  const history = await driverOperationsService.getMyHistory(req.user);
  res.send(history);
});

const getMyDashboard = catchAsync(async (req, res) => {
  const dashboard = await driverOperationsService.getMyDashboard(req.user);
  res.send(dashboard);
});

module.exports = {
  getMyTrips,
  getMyParcels,
  updateParcelStatus,
  getMyDamageLogs,
  createDamageLog,
  getMyHistory,
  getMyDashboard,
};
