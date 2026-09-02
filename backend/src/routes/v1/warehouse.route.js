const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const warehouseValidation = require('../../validations/warehouse.validation');
const warehouseController = require('../../controllers/warehouse.controller');

const router = express.Router();

router.get('/', auth('manageWarehouse'), warehouseController.getSnapshot);
router.get('/drivers', auth('manageWarehouse'), warehouseController.listRegisteredDrivers);
router.post('/parcels/auto-assign', auth('manageWarehouse'), warehouseController.autoAssignParcels);
router.post(
  '/parcels/:parcelId/label',
  auth('manageWarehouse'),
  validate(warehouseValidation.parcelAction),
  warehouseController.labelParcel
);
router.post(
  '/parcels/:parcelId/batch',
  auth('manageWarehouse'),
  validate(warehouseValidation.addToBatch),
  warehouseController.addParcelToBatch
);
router.post(
  '/parcels/:parcelId/assign',
  auth('manageWarehouse'),
  validate(warehouseValidation.assignParcel),
  warehouseController.assignParcel
);
router.post(
  '/parcels/:parcelId/dispatch',
  auth('manageWarehouse'),
  validate(warehouseValidation.parcelAction),
  warehouseController.dispatchParcel
);
router.post(
  '/batches/:batchId/close',
  auth('manageWarehouse'),
  validate(warehouseValidation.closeBatch),
  warehouseController.closeBatch
);
router.post('/routes/auto-assign', auth('manageWarehouse'), warehouseController.autoAssignRoutes);
router.post(
  '/routes/:routeId/optimize',
  auth('manageWarehouse'),
  validate(warehouseValidation.optimizeRoute),
  warehouseController.optimizeRoute
);

module.exports = router;
