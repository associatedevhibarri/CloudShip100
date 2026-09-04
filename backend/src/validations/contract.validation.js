const Joi = require('joi');
const { objectId } = require('./custom.validation');

const sign = {
  params: Joi.object().keys({
    contractId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  sign,
};
