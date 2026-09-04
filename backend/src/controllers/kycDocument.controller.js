const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { companyService, kycDocumentService } = require('../services');

const getMyDocuments = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const documents = await kycDocumentService.queryDocumentsByCompany(company.id);
  res.send(documents);
});

const uploadMyDocument = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Document file is required');
  }
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const document = await kycDocumentService.createDocument(company.id, req.body, req.file);
  res.status(httpStatus.CREATED).send(document);
});

module.exports = {
  getMyDocuments,
  uploadMyDocument,
};
