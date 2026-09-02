const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const paymentRequestValidation = require('../../validations/paymentRequest.validation');
const paymentRequestController = require('../../controllers/paymentRequest.controller');

const router = express.Router();

router.get('/mine', auth('viewOwnPayments'), paymentRequestController.getMyPaymentRequests);
router.patch(
  '/:paymentRequestId/pay',
  auth('manageOwnPayments'),
  validate(paymentRequestValidation.pay),
  paymentRequestController.payMyPaymentRequest
);

module.exports = router;
