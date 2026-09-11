const Joi = require('joi');

const autocomplete = {
  query: Joi.object().keys({
    q: Joi.string().allow('').max(200),
    sessionToken: Joi.string().allow('').max(80),
    country: Joi.string().allow('').max(40),
  }),
};

const details = {
  query: Joi.object().keys({
    placeId: Joi.string().required().max(300),
    sessionToken: Joi.string().allow('').max(80),
  }),
};

module.exports = {
  autocomplete,
  details,
};
