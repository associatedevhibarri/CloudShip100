const Joi = require('joi');

const upload = {
  body: Joi.object().keys({
    type: Joi.string().required(),
    expiresAt: Joi.date().allow(null, ''),
  }),
};

module.exports = {
  upload,
};
