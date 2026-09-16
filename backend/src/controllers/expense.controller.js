const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { expenseService } = require('../services');

const listExpenses = catchAsync(async (req, res) => {
  const rows = await expenseService.queryExpenses(req.query.kind);
  res.send(rows);
});

const createExpense = catchAsync(async (req, res) => {
  const expense = await expenseService.createExpense(req.body);
  res.status(httpStatus.CREATED).send(expense);
});

module.exports = {
  listExpenses,
  createExpense,
};
