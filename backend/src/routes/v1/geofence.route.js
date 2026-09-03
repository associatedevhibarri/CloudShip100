const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const geofenceValidation = require('../../validations/geofence.validation');
const geofenceController = require('../../controllers/geofence.controller');

const router = express.Router();

router
  .route('/')
  .get(auth('manageGeofences'), geofenceController.listGeofences)
  .post(auth('manageGeofences'), validate(geofenceValidation.createGeofence), geofenceController.createGeofence);

router.post(
  '/evaluate',
  auth('manageGeofences'),
  validate(geofenceValidation.evaluatePoint),
  geofenceController.evaluatePoint
);

router
  .route('/:geofenceId')
  .patch(auth('manageGeofences'), validate(geofenceValidation.updateGeofence), geofenceController.updateGeofence)
  .delete(auth('manageGeofences'), validate(geofenceValidation.deleteGeofence), geofenceController.deleteGeofence);

module.exports = router;
