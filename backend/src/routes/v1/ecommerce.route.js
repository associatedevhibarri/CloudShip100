const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ecommerceValidation = require('../../validations/ecommerce.validation');
const ecommerceController = require('../../controllers/ecommerce.controller');

const router = express.Router();

router
  .route('/stores')
  .get(auth('viewOwnEcommerce'), ecommerceController.listStores)
  .post(auth('manageOwnEcommerce'), validate(ecommerceValidation.connectStore), ecommerceController.connectStore);

router
  .route('/stores/:connectionId')
  .patch(
    auth('manageOwnEcommerce'),
    validate(ecommerceValidation.updateStore),
    ecommerceController.updateStore
  )
  .delete(
    auth('manageOwnEcommerce'),
    validate(ecommerceValidation.connectionIdParam),
    ecommerceController.disconnectStore
  );

router.post(
  '/stores/:connectionId/orders',
  auth('manageOwnEcommerce'),
  validate(ecommerceValidation.connectionIdParam),
  ecommerceController.ingestOrder
);

router.post(
  '/quotes',
  auth('manageOwnEcommerce'),
  validate(ecommerceValidation.marketplaceQuote),
  ecommerceController.createQuote
);

router.get('/payments/config', auth('manageOwnPayments'), ecommerceController.getPaymentConfig);

router.post(
  '/bookings/:bookingId/pay',
  auth('manageOwnPayments'),
  validate(ecommerceValidation.createPayment),
  ecommerceController.createPayment
);

router.post(
  '/payments/:paymentIntentId/confirm',
  validate(ecommerceValidation.confirmPayment),
  ecommerceController.confirmPayment
);

router.get('/track/:code', ecommerceController.publicTrack);

module.exports = router;
