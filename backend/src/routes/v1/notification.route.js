const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const notificationController = require('../../controllers/notification.controller');
const notificationValidation = require('../../validations/notification.validation');

const router = express.Router();

router.get('/', auth('viewAllNotifications'), notificationController.getAllNotifications);
router.get('/mine', auth('viewOwnNotifications'), notificationController.getMyNotifications);
router.patch(
  '/:notificationId/read',
  auth(),
  validate(notificationValidation.notificationId),
  notificationController.markRead
);
router.delete(
  '/:notificationId',
  auth(),
  validate(notificationValidation.notificationId),
  notificationController.dismissNotification
);

module.exports = router;
