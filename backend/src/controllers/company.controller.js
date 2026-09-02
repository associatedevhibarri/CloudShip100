const catchAsync = require('../utils/catchAsync');
const { companyService } = require('../services');

const getMyCompany = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const outstanding = await companyService.getOutstandingBalance(company.id);
  res.send({ ...company.toJSON(), outstanding });
});

const updateMyCompany = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const updated = await companyService.updateCompanyById(company.id, req.body);
  const outstanding = await companyService.getOutstandingBalance(updated.id);
  res.send({ ...updated.toJSON(), outstanding });
});

module.exports = {
  getMyCompany,
  updateMyCompany,
};
