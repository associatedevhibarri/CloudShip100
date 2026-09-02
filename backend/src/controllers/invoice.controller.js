const catchAsync = require('../utils/catchAsync');
const { companyService, invoiceService } = require('../services');

const getMyInvoices = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const invoices = await invoiceService.queryInvoicesByCompany(company.id);
  res.send(invoices);
});

module.exports = {
  getMyInvoices,
};
