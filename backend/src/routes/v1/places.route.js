const express = require('express');
const validate = require('../../middlewares/validate');
const { placesLimiter } = require('../../middlewares/rateLimiter');
const placesValidation = require('../../validations/places.validation');
const placesController = require('../../controllers/places.controller');

const router = express.Router();

router.get('/autocomplete', placesLimiter, validate(placesValidation.autocomplete), placesController.autocomplete);
router.get('/details', placesLimiter, validate(placesValidation.details), placesController.details);

module.exports = router;
