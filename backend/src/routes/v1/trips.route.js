const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const tripValidation = require('../../validations/trip.validation');
const tripController = require('../../controllers/trip.controller');

const router = express.Router();

router
  .route('/')
  .get(auth('viewAllTrips'), validate(tripValidation.listTrips), tripController.getAllTrips)
  .post(auth('viewAllTrips'), validate(tripValidation.createTrip), tripController.createTrip);

router.patch(
  '/:tripId/reassign',
  auth('viewAllTrips'),
  validate(tripValidation.reassignTrip),
  tripController.reassignTrip
);

router.post(
  '/:tripId/cancel',
  auth('viewAllTrips'),
  validate(tripValidation.cancelTrip),
  tripController.cancelTrip
);

router.patch('/:tripId', auth('viewAllTrips'), validate(tripValidation.updateTrip), tripController.updateTrip);

module.exports = router;
