const Joi = require('joi');

const createLead = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(120).required(),
    email: Joi.string().email().required(),
    company: Joi.string().trim().min(2).max(160).required(),
    message: Joi.string().trim().min(5).max(2000).required(),
  }),
};

module.exports = {
  createLead,
};
