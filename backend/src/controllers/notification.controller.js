const catchAsync = require('../utils/catchAsync');
const { companyService, notificationService } = require('../services');

const getMyNotifications = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const notifications = await notificationService.queryNotificationsByCompany(company.id);
  res.send(notifications);
});

module.exports = {
  getMyNotifications,
};
