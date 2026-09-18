const httpStatus = require('http-status');
const { Notification } = require('../models');
const ApiError = require('../utils/ApiError');

const notDismissed = { dismissed: { $ne: true } };

/**
 * Get all notifications for a company, plus broadcast notifications (company: null)
 * @param {ObjectId} companyId
 * @returns {Promise<Notification[]>}
 */
const queryNotificationsByCompany = async (companyId) => {
  return Notification.find({
    $and: [notDismissed, { $or: [{ company: companyId }, { company: null }] }],
  }).sort('-sentAt');
};

/**
 * Operator inbox: every company notification plus broadcasts.
 * @returns {Promise<Notification[]>}
 */
const queryAllNotifications = async () => {
  return Notification.find(notDismissed).populate('company', 'name').sort('-sentAt');
};

const findOwnedNotification = async (notificationId, { companyId, isOperator }) => {
  const filter = { _id: notificationId, ...notDismissed };
  if (!isOperator) {
    if (!companyId) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
    }
    filter.company = companyId;
  }
  const notification = await Notification.findOne(filter);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }
  return notification;
};

const markRead = async (notificationId, access) => {
  const notification = await findOwnedNotification(notificationId, access);
  notification.unread = false;
  await notification.save();
  return notification;
};

const dismissNotification = async (notificationId, access) => {
  const notification = await findOwnedNotification(notificationId, access);
  notification.dismissed = true;
  notification.unread = false;
  await notification.save();
  return notification;
};

module.exports = {
  queryNotificationsByCompany,
  queryAllNotifications,
  markRead,
  dismissNotification,
};
