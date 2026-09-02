const express = require('express');
const validate = require('../../middlewares/validate');
const { quoteLimiter } = require('../../middlewares/rateLimiter');
const pricingValidation = require('../../validations/pricing.validation');
const pricingController = require('../../controllers/pricing.controller');

const router = express.Router();

// Public — the Home page's live pricing widget needs this before a visitor logs in.
router.post('/quote', quoteLimiter, validate(pricingValidation.getQuote), pricingController.getQuote);

module.exports = router;
