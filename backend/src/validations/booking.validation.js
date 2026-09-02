const Joi = require('joi');

const createBooking = {
  body: Joi.object().keys({
    pickup: Joi.string().required(),
    dropoff: Joi.string().required(),
    cargo: Joi.string().required(),
    weightKg: Joi.number().positive().required(),
    mode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail').required(),
  }),
};

module.exports = {
  createBooking,
};
