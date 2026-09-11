const catchAsync = require('../utils/catchAsync');
const googleMapsService = require('../services/googleMaps.service');

const autocomplete = catchAsync(async (req, res) => {
  const result = await googleMapsService.autocompletePlaces({
    input: req.query.q,
    sessionToken: req.query.sessionToken,
    country: req.query.country,
  });
  res.send(result);
});

const details = catchAsync(async (req, res) => {
  const result = await googleMapsService.getPlaceDetails({
    placeId: req.query.placeId,
    sessionToken: req.query.sessionToken,
  });
  res.send(result);
});

module.exports = {
  autocomplete,
  details,
};
