const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { quoteLimiter } = require('../../middlewares/rateLimiter');
const pricingValidation = require('../../validations/pricing.validation');
const pricingController = require('../../controllers/pricing.controller');

const router = express.Router();

// Public — the Home page's live pricing widget needs this before a visitor logs in.
router.post('/quote', quoteLimiter, validate(pricingValidation.getQuote), pricingController.getQuote);

// Operator-owned rate card
router
  .route('/rates')
  .get(auth('managePricing'), pricingController.getRates)
  .put(auth('managePricing'), validate(pricingValidation.upsertRates), pricingController.upsertRates);

module.exports = router;
