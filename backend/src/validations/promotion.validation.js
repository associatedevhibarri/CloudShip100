const Joi = require('joi');

const create = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    body: Joi.string().required(),
    tag: Joi.string().allow(''),
  }),
};

module.exports = {
  create,
};
