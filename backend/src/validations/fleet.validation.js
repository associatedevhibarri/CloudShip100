const Joi = require('joi');
const { FLEET_TYPES } = require('../models/fleetAsset.model');

const listFleet = {
  query: Joi.object().keys({
    type: Joi.string().valid(...FLEET_TYPES),
  }),
};

const createFleetAsset = {
  body: Joi.object().keys({
    type: Joi.string()
      .valid(...FLEET_TYPES)
      .required(),
    code: Joi.string().trim(),
    name: Joi.string().trim().allow('', null),
    status: Joi.string().trim().allow('', null),
  }).unknown(true),
};

module.exports = {
  listFleet,
  createFleetAsset,
};
