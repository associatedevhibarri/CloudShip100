const Joi = require('joi');

const kinds = ['fuel', 'yard_fee', 'airport_fee', 'salary'];

const listExpenses = {
  query: Joi.object().keys({
    kind: Joi.string().valid(...kinds),
  }),
};

const createExpense = {
  body: Joi.object().keys({
    kind: Joi.string()
      .valid(...kinds)
      .required(),
    date: Joi.date().iso().allow(null, ''),
    period: Joi.string().trim().allow('', null),
    asset: Joi.string().trim().allow('', null),
    liters: Joi.number().allow(null),
    cost: Joi.number().allow(null),
    amount: Joi.number().allow(null),
    location: Joi.string().trim().allow('', null),
    yard: Joi.string().trim().allow('', null),
    airport: Joi.string().trim().allow('', null),
    description: Joi.string().trim().allow('', null),
    person: Joi.string().trim().allow('', null),
    role: Joi.string().trim().allow('', null),
  }),
};

module.exports = {
  listExpenses,
  createExpense,
};
