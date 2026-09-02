const Joi = require('joi');

const create = {
  body: Joi.object().keys({
    mode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail').required(),
    cargo: Joi.string().required().trim(),
    value: Joi.number().min(0).required(),
    pickup: Joi.string().required().trim(),
    dropoff: Joi.string().required().trim(),
  }),
};

module.exports = {
  create,
};
