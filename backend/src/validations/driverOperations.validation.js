const Joi = require('joi');

const getMyTrips = {
  query: Joi.object().keys({
    bucket: Joi.string().valid('all', 'active', 'upcoming', 'completed', 'starting_soon', 'in_progress', 'ending_soon'),
  }),
};

const getMyParcels = {
  query: Joi.object().keys({
    status: Joi.string().valid('assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'),
  }),
};

const updateParcelStatus = {
  params: Joi.object().keys({
    parcelCode: Joi.string().required(),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('picked_up', 'in_transit', 'delivered').required(),
    recipientName: Joi.string().trim().when('status', { is: 'delivered', then: Joi.required(), otherwise: Joi.optional() }),
    signatureName: Joi.string().trim().when('status', { is: 'delivered', then: Joi.required(), otherwise: Joi.optional() }),
    notes: Joi.string().trim().allow('', null),
    lat: Joi.number().min(-90).max(90).allow(null),
    lng: Joi.number().min(-180).max(180).allow(null),
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

const pingLocation = {
  body: Joi.object().keys({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    heading: Joi.number().allow(null),
    speed: Joi.number().allow(null),
    accuracy: Joi.number().allow(null),
    at: Joi.date().iso().allow(null),
  }),
};

module.exports = {
  getMyTrips,
  getMyParcels,
  updateParcelStatus,
  createDamageLog,
  pingLocation,
};
