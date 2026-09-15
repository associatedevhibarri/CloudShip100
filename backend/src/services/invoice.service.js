const { Invoice } = require('../models');

/**
 * Get all invoices for a company
 * @param {ObjectId} companyId
 * @returns {Promise<Invoice[]>}
 */
const queryInvoicesByCompany = async (companyId) => {
  return Invoice.find({ company: companyId }).sort('-due');
};

/**
 * Operator list of all invoices.
 * @returns {Promise<Invoice[]>}
 */
const queryAllInvoices = async () => {
  return Invoice.find().populate('company', 'name').sort('-due');
};

module.exports = {
  queryInvoicesByCompany,
  queryAllInvoices,
};
