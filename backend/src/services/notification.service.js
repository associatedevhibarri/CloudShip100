const { Notification } = require('../models');

/**
 * Get all notifications for a company, plus broadcast notifications (company: null)
 * @param {ObjectId} companyId
 * @returns {Promise<Notification[]>}
 */
const queryNotificationsByCompany = async (companyId) => {
  return Notification.find({ $or: [{ company: companyId }, { company: null }] }).sort('-sentAt');
};

module.exports = {
  queryNotificationsByCompany,
};
