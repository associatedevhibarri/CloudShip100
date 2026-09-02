const Joi = require('joi');

const assignParcel = {
  params: Joi.object().keys({
    parcelId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    employeeId: Joi.string().trim(),
  }),
};

module.exports = {
  assignParcel,
};
