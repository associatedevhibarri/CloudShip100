const express = require('express');
const auth = require('../../middlewares/auth');
const notificationController = require('../../controllers/notification.controller');

const router = express.Router();

router.get('/', auth('viewAllNotifications'), notificationController.getAllNotifications);
router.get('/mine', auth('viewOwnNotifications'), notificationController.getMyNotifications);

module.exports = router;
