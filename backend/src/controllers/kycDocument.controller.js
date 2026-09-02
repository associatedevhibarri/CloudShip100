const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { companyService, kycDocumentService } = require('../services');

const getMyDocuments = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const documents = await kycDocumentService.queryDocumentsByCompany(company.id);
  res.send(documents);
});

const uploadMyDocument = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const document = await kycDocumentService.createDocument(company.id, req.body);
  res.status(httpStatus.CREATED).send(document);
});

module.exports = {
  getMyDocuments,
  uploadMyDocument,
};
