const express = require('express');
const auth = require('../../middlewares/auth');
const invoiceController = require('../../controllers/invoice.controller');

const router = express.Router();

router.get('/mine', auth('viewOwnInvoices'), invoiceController.getMyInvoices);

module.exports = router;
