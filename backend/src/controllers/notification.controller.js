const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { companyService, notificationService } = require('../services');
const { roleRights } = require('../config/roles');

const accessFor = async (req) => {
  const rights = roleRights.get(req.user.role) || [];
  const isOperator = rights.includes('viewAllNotifications');
  const isCustomer = rights.includes('viewOwnNotifications');
  if (!isOperator && !isCustomer) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  let companyId = null;
  if (!isOperator) {
    const company = await companyService.getOrCreateCompanyForUser(req.user);
    companyId = company.id;
  }
  return { isOperator, companyId };
};

const getMyNotifications = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const notifications = await notificationService.queryNotificationsByCompany(company.id);
  res.send(notifications);
});

const getAllNotifications = catchAsync(async (req, res) => {
  const notifications = await notificationService.queryAllNotifications();
  res.send(notifications);
});

const markRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markRead(req.params.notificationId, await accessFor(req));
  res.send(notification);
});

const dismissNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.dismissNotification(req.params.notificationId, await accessFor(req));
  res.send(notification);
});

module.exports = {
  getMyNotifications,
  getAllNotifications,
  markRead,
  dismissNotification,
};
