const { Contract } = require('../models');

/**
 * Get all contracts for a company
 * @param {ObjectId} companyId
 * @returns {Promise<Contract[]>}
 */
const queryContractsByCompany = async (companyId) => {
  return Contract.find({ company: companyId }).sort('-startDate');
};

module.exports = {
  queryContractsByCompany,
};
