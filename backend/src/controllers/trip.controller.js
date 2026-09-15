const catchAsync = require('../utils/catchAsync');
const { tripService } = require('../services');

const getAllTrips = catchAsync(async (req, res) => {
  const trips = await tripService.queryAllTrips(req.query);
  res.send(trips);
});

module.exports = {
  getAllTrips,
};
