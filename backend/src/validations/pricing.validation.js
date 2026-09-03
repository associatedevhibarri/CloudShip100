const Joi = require('joi');

const getQuote = {
  body: Joi.object().keys({
    pickup: Joi.string().required(),
    dropoff: Joi.string().required(),
    weightKg: Joi.number().positive().required(),
    mode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail').required(),
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
