const express = require('express');
const auth = require('../../middlewares/auth');
const weatherController = require('../../controllers/weather.controller');

const router = express.Router();

router.get('/', auth('viewOpsDashboard'), weatherController.getWeather);

module.exports = router;
