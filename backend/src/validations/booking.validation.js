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
      quoteId: Joi.string().trim(),
      partnerId: Joi.string().trim(),
      lengthCm: Joi.number().positive(),
      widthCm: Joi.number().positive(),
      heightCm: Joi.number().positive(),
      pickupDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      declaredValue: Joi.number().min(0),
    })
    .or('weightKg', 'value', 'quoteId'),
};

module.exports = {
  createBooking,
};
