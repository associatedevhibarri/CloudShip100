const catchAsync = require('../utils/catchAsync');
const { companyService, paymentRequestService } = require('../services');

const getMyPaymentRequests = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const paymentRequests = await paymentRequestService.queryPaymentRequestsByCompany(company.id);
  res.send(paymentRequests);
});

const payMyPaymentRequest = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const paymentRequest = await paymentRequestService.payPaymentRequest(company.id, req.params.paymentRequestId);
  res.send(paymentRequest);
});

module.exports = {
  getMyPaymentRequests,
  payMyPaymentRequest,
};
