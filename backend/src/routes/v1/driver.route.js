const express = require('express');
const auth = require('../../middlewares/auth');
const requireDriver = require('../../middlewares/requireDriver');
const validate = require('../../middlewares/validate');
const upload = require('../../middlewares/upload');
const driverProfileValidation = require('../../validations/driverProfile.validation');
const driverOperationsValidation = require('../../validations/driverOperations.validation');
const driverProfileController = require('../../controllers/driverProfile.controller');
const driverOperationsController = require('../../controllers/driverOperations.controller');

const router = express.Router();

router.use(auth(), requireDriver);

router.get('/me/dashboard', driverOperationsController.getMyDashboard);

router
  .route('/me/profile')
  .get(driverProfileController.getMyProfile)
  .patch(validate(driverProfileValidation.updateMyProfile), driverProfileController.updateMyProfile);

router
  .route('/me/trips')
  .get(validate(driverOperationsValidation.getMyTrips), driverOperationsController.getMyTrips);

router
  .route('/me/parcels')
  .get(validate(driverOperationsValidation.getMyParcels), driverOperationsController.getMyParcels);

router
  .route('/me/parcels/:parcelCode/status')
  .patch(validate(driverOperationsValidation.updateParcelStatus), driverOperationsController.updateParcelStatus);

router
  .route('/me/damage-logs')
  .get(driverOperationsController.getMyDamageLogs)
  .post(validate(driverOperationsValidation.createDamageLog), driverOperationsController.createDamageLog);

router.get('/me/history', driverOperationsController.getMyHistory);

router
  .route('/me/documents')
  .post(
    upload.single('document'),
    validate(driverProfileValidation.uploadDocument),
    driverProfileController.uploadDocument
  );

router
  .route('/me/documents/:documentId')
  .delete(validate(driverProfileValidation.deleteDocument), driverProfileController.deleteDocument);

module.exports = router;
