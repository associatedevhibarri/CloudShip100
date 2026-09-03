const Joi = require('joi');

const geofenceBody = {
  id: Joi.string().trim(),
  name: Joi.string().trim().min(2).max(160).required(),
  scope: Joi.string().valid('country', 'province', 'radius').required(),
  region: Joi.string().trim().min(2).max(160).required(),
  radiusKm: Joi.number().min(0).allow(null),
  rule: Joi.string().trim().min(2).max(240).required(),
  exclusions: Joi.array().items(Joi.string().trim().max(160)).default([]),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
  active: Joi.boolean(),
};

const createGeofence = {
  body: Joi.object().keys(geofenceBody),
};

const updateGeofence = {
  params: Joi.object().keys({
    geofenceId: Joi.string().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim().min(2).max(160),
      scope: Joi.string().valid('country', 'province', 'radius'),
      region: Joi.string().trim().min(2).max(160),
      radiusKm: Joi.number().min(0).allow(null),
      rule: Joi.string().trim().min(2).max(240),
      exclusions: Joi.array().items(Joi.string().trim().max(160)),
      lat: Joi.number().min(-90).max(90).allow(null),
      lng: Joi.number().min(-180).max(180).allow(null),
      active: Joi.boolean(),
    })
    .min(1),
};

const deleteGeofence = {
  params: Joi.object().keys({
    geofenceId: Joi.string().required(),
  }),
};

const evaluatePoint = {
  body: Joi.object().keys({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }),
};

module.exports = {
  createGeofence,
  updateGeofence,
  deleteGeofence,
  evaluatePoint,
};
