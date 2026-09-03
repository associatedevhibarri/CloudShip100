const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { quoteLimiter } = require('../../middlewares/rateLimiter');
const leadValidation = require('../../validations/lead.validation');
const leadController = require('../../controllers/lead.controller');

const router = express.Router();

// Public — landing page lead capture
router.post('/', quoteLimiter, validate(leadValidation.createLead), leadController.createLead);

// Operator inbox
router.get('/', auth('manageLeads'), leadController.getLeads);

module.exports = router;
