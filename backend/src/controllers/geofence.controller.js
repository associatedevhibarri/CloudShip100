const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const geofenceService = require('../services/geofence.service');

const listGeofences = catchAsync(async (req, res) => {
  const geofences = await geofenceService.listGeofences();
  res.send(geofences);
});

const createGeofence = catchAsync(async (req, res) => {
  const geofence = await geofenceService.createGeofence(req.body);
  res.status(httpStatus.CREATED).send(geofence);
});

const updateGeofence = catchAsync(async (req, res) => {
  const geofence = await geofenceService.updateGeofence(req.params.geofenceId, req.body);
  res.send(geofence);
});

const deleteGeofence = catchAsync(async (req, res) => {
  await geofenceService.deleteGeofence(req.params.geofenceId);
  res.status(httpStatus.NO_CONTENT).send();
});

const evaluatePoint = catchAsync(async (req, res) => {
  const result = await geofenceService.evaluatePoint(req.body);
  res.send(result);
});

module.exports = {
  listGeofences,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  evaluatePoint,
};
