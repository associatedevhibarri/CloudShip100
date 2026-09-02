const httpStatus = require('http-status');
const { PaymentRequest, Invoice } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Get all payment requests for a company
 * @param {ObjectId} companyId
 * @returns {Promise<PaymentRequest[]>}
 */
const queryPaymentRequestsByCompany = async (companyId) => {
  return PaymentRequest.find({ company: companyId }).sort('-dueDate');
};

/**
 * Mark a payment request as paid, and settle its linked invoice.
 * @param {ObjectId} companyId - the requesting user's company (ownership check)
 * @param {ObjectId} paymentRequestId
 * @returns {Promise<PaymentRequest>}
 */
const payPaymentRequest = async (companyId, paymentRequestId) => {
  const paymentRequest = await PaymentRequest.findById(paymentRequestId);
  if (!paymentRequest || String(paymentRequest.company) !== String(companyId)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment request not found');
  }
  if (paymentRequest.status !== 'paid') {
    paymentRequest.status = 'paid';
    await paymentRequest.save();
    if (paymentRequest.invoice) {
      await Invoice.findByIdAndUpdate(paymentRequest.invoice, { status: 'Paid' });
    }
  }
  return paymentRequest;
};

module.exports = {
  queryPaymentRequestsByCompany,
  payPaymentRequest,
};
