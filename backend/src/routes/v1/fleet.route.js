const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const fleetValidation = require('../../validations/fleet.validation');
const fleetController = require('../../controllers/fleet.controller');

const router = express.Router();

router
  .route('/')
  .get(auth('manageFleet'), validate(fleetValidation.listFleet), fleetController.listFleet)
  .post(auth('manageFleet'), validate(fleetValidation.createFleetAsset), fleetController.createFleetAsset);

module.exports = router;
