const Joi = require('joi');

const getQuote = {
  body: Joi.object().keys({
    pickup: Joi.string().required(),
    dropoff: Joi.string().required(),
    weightKg: Joi.number().positive().required(),
    mode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail'),
    cargo: Joi.string().allow(''),
    lengthCm: Joi.number().positive(),
    widthCm: Joi.number().positive(),
    heightCm: Joi.number().positive(),
    declaredValue: Joi.number().min(0),
    pickupPhone: Joi.string().allow(''),
    dropoffPhone: Joi.string().allow(''),
    pickupName: Joi.string().allow(''),
    dropoffName: Joi.string().allow(''),
    pickupDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    collectionBuildingType: Joi.string().allow(''),
    deliveryBuildingType: Joi.string().allow(''),
    cargoCategory: Joi.string().allow(''),
    quantity: Joi.number().positive(),
    unit: Joi.string().allow(''),
    volumeM3: Joi.number().positive(),
  }),
};

const rateRow = Joi.object().keys({
  mode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail').required(),
  baseFee: Joi.number().min(0).required(),
  perKm: Joi.number().min(0).required(),
  perKg: Joi.number().min(0).required(),
  active: Joi.boolean(),
});

const upsertRates = {
  body: Joi.object().keys({
    rates: Joi.array().items(rateRow).min(1).max(4).required(),
  }),
};

module.exports = {
  getQuote,
  upsertRates,
};
