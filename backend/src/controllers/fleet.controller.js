const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { fleetService } = require('../services');

const listFleet = catchAsync(async (req, res) => {
  const rows = await fleetService.queryFleet(req.query.type);
  res.send(rows);
});

const createFleetAsset = catchAsync(async (req, res) => {
  const asset = await fleetService.createFleetAsset(req.body);
  res.status(httpStatus.CREATED).send(asset);
});

module.exports = {
  listFleet,
  createFleetAsset,
};
