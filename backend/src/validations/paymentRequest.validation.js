const Joi = require('joi');
const { objectId } = require('./custom.validation');

const pay = {
  params: Joi.object().keys({
    paymentRequestId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  pay,
};
