const catchAsync = require('../utils/catchAsync');
const { financeService } = require('../services');

const getFinanceSummary = catchAsync(async (req, res) => {
  const summary = await financeService.getFinanceSummary();
  res.send(summary);
});

module.exports = {
  getFinanceSummary,
};
