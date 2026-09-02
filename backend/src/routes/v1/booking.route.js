const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const bookingValidation = require('../../validations/booking.validation');
const bookingController = require('../../controllers/booking.controller');

const router = express.Router();

router
  .route('/mine')
  .get(auth('viewOwnBookings'), bookingController.getMyBookings)
  .post(auth('manageOwnBookings'), validate(bookingValidation.create), bookingController.createMyBooking);

module.exports = router;
