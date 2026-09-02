const express = require('express');
const auth = require('../../middlewares/auth');
const warehouseController = require('../../controllers/warehouse.controller');

const router = express.Router();

router.get('/', auth('manageWarehouse'), warehouseController.getSnapshot);
router.post('/parcels/auto-assign', auth('manageWarehouse'), warehouseController.autoAssignParcels);
router.post('/parcels/:parcelId/assign', auth('manageWarehouse'), warehouseController.assignParcel);
router.post('/routes/auto-assign', auth('manageWarehouse'), warehouseController.autoAssignRoutes);

module.exports = router;
