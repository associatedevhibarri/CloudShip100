const Joi = require('joi');

const getMyTrips = {
  query: Joi.object().keys({
    bucket: Joi.string().valid('all', 'active', 'upcoming', 'completed', 'starting_soon', 'in_progress', 'ending_soon'),
  }),
};

const getMyParcels = {
  query: Joi.object().keys({
    status: Joi.string().valid('assigned', 'picked_up', 'in_transit', 'delivered'),
  }),
};

const updateParcelStatus = {
  params: Joi.object().keys({
    parcelCode: Joi.string().required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('assigned', 'picked_up', 'in_transit', 'delivered').required(),
  }),
};

const createDamageLog = {
  body: Joi.object().keys({
    parcelId: Joi.string().allow('', null),
    tripId: Joi.string().allow('', null),
    severity: Joi.string().valid('minor', 'major').required(),
    description: Joi.string().trim().min(5).required(),
    location: Joi.string().trim().allow('', null),
  }),
};

module.exports = {
  getMyTrips,
  getMyParcels,
  updateParcelStatus,
  createDamageLog,
};
