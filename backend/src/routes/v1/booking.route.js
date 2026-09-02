const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const bookingValidation = require('../../validations/booking.validation');
const bookingController = require('../../controllers/booking.controller');

const router = express.Router();

router.get('/mine', auth('viewOwnBookings'), bookingController.getMyBookings);
router.post('/', auth('manageOwnBookings'), validate(bookingValidation.createBooking), bookingController.createBooking);

module.exports = router;
