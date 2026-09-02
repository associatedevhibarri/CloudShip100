const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Company, Invoice, User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a company
 * @param {Object} companyBody
 * @returns {Promise<Company>}
 */
const createCompany = async (companyBody) => {
  return Company.create(companyBody);
};

/**
 * Get the company linked to a user, creating a fallback one if the user
 * predates company linkage (e.g. an account created before this feature shipped).
 * @param {User} user
 * @returns {Promise<Company>}
 */
const getOrCreateCompanyForUser = async (user) => {
  if (user.company) {
    const existing = await Company.findById(user.company);
    if (existing) {
      return existing;
    }
  }
  const company = await createCompany({
    name: `${user.name}'s Company`,
    contact: user.name,
    email: user.email,
    owner: user._id,
  });
  await User.findByIdAndUpdate(user._id, { company: company._id });
  return company;
};

/**
 * Update a company by id
 * @param {ObjectId} companyId
 * @param {Object} updateBody
 * @returns {Promise<Company>}
 */
const updateCompanyById = async (companyId, updateBody) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Company not found');
  }
  Object.assign(company, updateBody);
  await company.save();
  return company;
};

/**
 * Sum of all open (unpaid) invoices for a company
 * @param {ObjectId} companyId
 * @returns {Promise<number>}
 */
const getOutstandingBalance = async (companyId) => {
  const result = await Invoice.aggregate([
    { $match: { company: new mongoose.Types.ObjectId(companyId), status: 'Open' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return (result[0] && result[0].total) || 0;
};

module.exports = {
  createCompany,
  getOrCreateCompanyForUser,
  updateCompanyById,
  getOutstandingBalance,
};
