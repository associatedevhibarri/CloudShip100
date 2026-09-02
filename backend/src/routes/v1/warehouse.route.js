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
  '/parcels/:parcelId/assign',
  auth('manageWarehouse'),
  validate(warehouseValidation.assignParcel),
  warehouseController.assignParcel
);
router.post('/routes/auto-assign', auth('manageWarehouse'), warehouseController.autoAssignRoutes);

module.exports = router;
