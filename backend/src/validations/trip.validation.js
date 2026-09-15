const Joi = require('joi');

const listTrips = {
  query: Joi.object().keys({
    status: Joi.string().valid('starting_soon', 'in_progress', 'ending_soon', 'completed'),
    mode: Joi.string().valid('road', 'air', 'maritime', 'rail'),
  }),
};

module.exports = {
  listTrips,
};
