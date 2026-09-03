const Joi = require('joi');

const parcelIdParam = {
  params: Joi.object().keys({
    parcelId: Joi.string().required(),
  }),
};

const assignParcel = {
  ...parcelIdParam,
  body: Joi.object().keys({
    employeeId: Joi.string().trim(),
    fleetType: Joi.string().trim(),
    truck: Joi.string().trim(),
    driver: Joi.string().trim(),
    partner: Joi.string().trim().allow(null, ''),
  }),
};

const addToBatch = {
  ...parcelIdParam,
  body: Joi.object().keys({
    batchId: Joi.string().required(),
  }),
};

const closeBatch = {
  params: Joi.object().keys({
    batchId: Joi.string().required(),
  }),
};

const createBatch = {
  body: Joi.object().keys({
    name: Joi.string().required().trim(),
    warehouse: Joi.string().required().trim(),
    destination: Joi.string().required().trim(),
  }),
};

const optimizeRoute = {
  params: Joi.object().keys({
    routeId: Joi.string().required(),
  }),
};

const toggleZone = {
  params: Joi.object().keys({
    zoneId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    active: Joi.boolean().required(),
  }),
};

module.exports = {
  assignParcel,
  parcelAction: parcelIdParam,
  addToBatch,
  closeBatch,
  createBatch,
  optimizeRoute,
  toggleZone,
};
