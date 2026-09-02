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

module.exports = {
  assignParcel,
  parcelAction: parcelIdParam,
  addToBatch,
  closeBatch,
};
