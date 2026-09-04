const httpStatus = require('http-status');
const { Contract } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Get all contracts for a company
 * @param {ObjectId} companyId
 * @returns {Promise<Contract[]>}
 */
const queryContractsByCompany = async (companyId) => {
  return Contract.find({ company: companyId }).sort('-startDate');
};

/**
 * Sign a pending contract, moving it to active.
 * @param {ObjectId} companyId - the requesting user's company (ownership check)
 * @param {ObjectId} contractId
 * @returns {Promise<Contract>}
 */
const signContract = async (companyId, contractId) => {
  const contract = await Contract.findById(contractId);
  if (!contract || String(contract.company) !== String(companyId)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Contract not found');
  }
  if (contract.status !== 'pending_signature') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only contracts pending signature can be signed');
  }
  contract.status = 'active';
  await contract.save();
  return contract;
};

module.exports = {
  queryContractsByCompany,
  signContract,
};
