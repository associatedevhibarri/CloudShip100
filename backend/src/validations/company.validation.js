const Joi = require('joi');

const updateMyCompany = {
  body: Joi.object().keys({
    contact: Joi.string(),
    phone: Joi.string().allow(''),
    tier: Joi.string().valid('Standard', 'Growth', 'Enterprise'),
  }),
};

module.exports = {
  updateMyCompany,
};
