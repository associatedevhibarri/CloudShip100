const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const tripValidation = require('../../validations/trip.validation');
const tripController = require('../../controllers/trip.controller');

const router = express.Router();

router.get('/', auth('viewAllTrips'), validate(tripValidation.listTrips), tripController.getAllTrips);

module.exports = router;
