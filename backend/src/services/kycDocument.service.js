const { KycDocument } = require('../models');

/**
 * Get all KYC/FICA/AML documents for a company
 * @param {ObjectId} companyId
 * @returns {Promise<KycDocument[]>}
 */
const queryDocumentsByCompany = async (companyId) => {
  return KycDocument.find({ company: companyId }).sort('-uploadedAt');
};

/**
 * Create a KYC/FICA/AML document for a company
 * @param {ObjectId} companyId
 * @param {Object} documentBody
 * @returns {Promise<KycDocument>}
 */
const createDocument = async (companyId, documentBody) => {
  return KycDocument.create({
    company: companyId,
    type: documentBody.type,
    fileName: documentBody.fileName,
    expiresAt: documentBody.expiresAt || null,
    status: 'pending',
  });
};

module.exports = {
  queryDocumentsByCompany,
  createDocument,
};
