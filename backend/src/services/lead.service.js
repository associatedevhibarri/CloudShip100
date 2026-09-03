const { Lead } = require('../models');

/**
 * Create a sales lead from the public landing form
 * @param {Object} body
 * @returns {Promise<Lead>}
 */
const createLead = async (body) => {
  return Lead.create({
    name: body.name,
    email: body.email,
    company: body.company,
    message: body.message,
  });
};

/**
 * List leads (newest first)
 * @returns {Promise<Lead[]>}
 */
const queryLeads = async () => {
  return Lead.find().sort('-createdAt');
};

module.exports = {
  createLead,
  queryLeads,
};
