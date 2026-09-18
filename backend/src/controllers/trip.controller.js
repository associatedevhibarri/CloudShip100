const catchAsync = require('../utils/catchAsync');
const { tripService } = require('../services');

const getAllTrips = catchAsync(async (req, res) => {
  const trips = await tripService.queryAllTrips(req.query);
  res.send(trips);
});

const createTrip = catchAsync(async (req, res) => {
  const trip = await tripService.createTrip(req.body);
  res.status(201).send(trip);
});

const updateTrip = catchAsync(async (req, res) => {
  const trip = await tripService.updateTrip(req.params.tripId, req.body);
  res.send(trip);
});

const reassignTrip = catchAsync(async (req, res) => {
  const trip = await tripService.reassignTrip(req.params.tripId, req.body.employeeId);
  res.send(trip);
});

const cancelTrip = catchAsync(async (req, res) => {
  const trip = await tripService.cancelTrip(req.params.tripId);
  res.send(trip);
});

module.exports = {
  getAllTrips,
  createTrip,
  updateTrip,
  reassignTrip,
  cancelTrip,
};
