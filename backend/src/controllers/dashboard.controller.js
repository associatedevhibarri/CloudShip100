const catchAsync = require('../utils/catchAsync');
const { dashboardService } = require('../services');

const getOpsDashboard = catchAsync(async (req, res) => {
  const dashboard = await dashboardService.getOpsDashboard();
  res.send(dashboard);
});

module.exports = {
  getOpsDashboard,
};
