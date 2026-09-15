const express = require('express');
const auth = require('../../middlewares/auth');
const dashboardController = require('../../controllers/dashboard.controller');

const router = express.Router();

router.get('/', auth('viewOpsDashboard'), dashboardController.getOpsDashboard);

module.exports = router;
