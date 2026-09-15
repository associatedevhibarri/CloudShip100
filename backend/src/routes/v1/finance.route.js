const express = require('express');
const auth = require('../../middlewares/auth');
const financeController = require('../../controllers/finance.controller');

const router = express.Router();

router.get('/', auth('viewAllInvoices'), financeController.getFinanceSummary);

module.exports = router;
