const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const expenseValidation = require('../../validations/expense.validation');
const expenseController = require('../../controllers/expense.controller');

const router = express.Router();

router
  .route('/')
  .get(auth('manageExpenses'), validate(expenseValidation.listExpenses), expenseController.listExpenses)
  .post(auth('manageExpenses'), validate(expenseValidation.createExpense), expenseController.createExpense);

module.exports = router;
