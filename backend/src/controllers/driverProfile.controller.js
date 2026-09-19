const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { driverProfileService } = require('../services');

const getMyProfile = catchAsync(async (req, res) => {
  const profile = await driverProfileService.getOrCreateProfileByUserId(req.user);
  res.send(profile);
});

const updateMyProfile = catchAsync(async (req, res) => {
  const profile = await driverProfileService.updateProfileByUserId(req.user, req.body);
  res.send(profile);
});

const uploadDocument = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(httpStatus.BAD_REQUEST).send({ message: 'Document file is required' });
  }

  const profile = await driverProfileService.addDocument(req.user, req.file, req.body.type);
  res.status(httpStatus.CREATED).send(profile);
});

const deleteDocument = catchAsync(async (req, res) => {
  const profile = await driverProfileService.deleteDocument(req.user, req.params.documentId);
  res.send(profile);
});

const listDrivers = catchAsync(async (req, res) => {
  const drivers = await driverProfileService.listDriversForOperator();
  res.send(drivers);
});

const listLiveLocations = catchAsync(async (req, res) => {
  const locations = await driverProfileService.listLiveLocations();
  res.send(locations);
});

const pingMyLocation = catchAsync(async (req, res) => {
  const location = await driverProfileService.pingMyLocation(req.user, req.body);
  res.send(location);
});

const setApprovalStatus = catchAsync(async (req, res) => {
  const profile = await driverProfileService.setApprovalStatus(req.params.employeeId, req.body.approvalStatus);
  res.send(profile);
});

module.exports = {
  listDrivers,
  listLiveLocations,
  pingMyLocation,
  setApprovalStatus,
  getMyProfile,
  updateMyProfile,
  uploadDocument,
  deleteDocument,
};
