const Joi = require('joi');
const { objectId } = require('./custom.validation');

const notificationId = {
  params: Joi.object().keys({
    notificationId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  notificationId,
};
