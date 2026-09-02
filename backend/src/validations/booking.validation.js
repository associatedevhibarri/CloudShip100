const Joi = require('joi');

const createBooking = {
  body: Joi.object()
    .keys({
      pickup: Joi.string().required().trim(),
      dropoff: Joi.string().required().trim(),
      cargo: Joi.string().required().trim(),
      mode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail').required(),
      weightKg: Joi.number().positive(),
      value: Joi.number().min(0),
    })
    .or('weightKg', 'value'),
};

module.exports = {
  createBooking,
};
