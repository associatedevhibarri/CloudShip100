const Joi = require('joi');

const getQuote = {
  body: Joi.object().keys({
    pickup: Joi.string().required(),
    dropoff: Joi.string().required(),
    weightKg: Joi.number().positive().required(),
    mode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail').required(),
  }),
};

module.exports = {
  getQuote,
};
