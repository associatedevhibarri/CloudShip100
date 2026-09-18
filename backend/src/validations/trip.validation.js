const Joi = require('joi');
const { objectId } = require('./custom.validation');

const listTrips = {
  query: Joi.object().keys({
    status: Joi.string().valid('starting_soon', 'in_progress', 'ending_soon', 'completed', 'cancelled'),
    mode: Joi.string().valid('road', 'air', 'maritime', 'rail'),
  }),
};

const tripIdParam = {
  params: Joi.object().keys({
    tripId: Joi.string().custom(objectId).required(),
  }),
};

const createTrip = {
  body: Joi.object().keys({
    employeeId: Joi.string().required(),
    cargo: Joi.string().trim().required(),
    pickup: Joi.string().trim().required(),
    dropoff: Joi.string().trim().required(),
    vehicle: Joi.string().trim().allow('', null),
    mode: Joi.string().valid('road', 'air', 'maritime', 'rail'),
    distanceKm: Joi.number().min(0),
    clientOrderId: Joi.string().trim().allow('', null),
    status: Joi.string().valid('starting_soon', 'in_progress', 'ending_soon'),
  }),
};

const updateTrip = {
  params: tripIdParam.params,
  body: Joi.object()
    .keys({
      vehicle: Joi.string().trim().allow('', null),
      cargo: Joi.string().trim(),
      pickup: Joi.string().trim(),
      dropoff: Joi.string().trim(),
      mode: Joi.string().valid('road', 'air', 'maritime', 'rail'),
      distanceKm: Joi.number().min(0),
      onTime: Joi.boolean(),
      status: Joi.string().valid('starting_soon', 'in_progress', 'ending_soon', 'completed', 'cancelled'),
    })
    .min(1),
};

const reassignTrip = {
  params: tripIdParam.params,
  body: Joi.object().keys({
    employeeId: Joi.string().required(),
  }),
};

const cancelTrip = tripIdParam;

module.exports = {
  listTrips,
  createTrip,
  updateTrip,
  reassignTrip,
  cancelTrip,
};
