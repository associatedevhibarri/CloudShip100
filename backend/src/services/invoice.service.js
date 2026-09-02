const { Invoice } = require('../models');

/**
 * Get all invoices for a company
 * @param {ObjectId} companyId
 * @returns {Promise<Invoice[]>}
 */
const queryInvoicesByCompany = async (companyId) => {
  return Invoice.find({ company: companyId }).sort('-due');
};

module.exports = {
  queryInvoicesByCompany,
};
