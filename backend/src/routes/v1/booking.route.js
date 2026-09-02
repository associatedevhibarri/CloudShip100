const express = require('express');
const auth = require('../../middlewares/auth');
const bookingController = require('../../controllers/booking.controller');

const router = express.Router();

router.get('/mine', auth('viewOwnBookings'), bookingController.getMyBookings);

module.exports = router;
