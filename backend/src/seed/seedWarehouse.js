require('../polyfills/slowBuffer');
const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../config/logger');
const warehouseService = require('../services/warehouse.service');
const geofenceService = require('../services/geofence.service');
const pricingService = require('../services/pricing.service');

const run = async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  logger.info('Connected to MongoDB');
  await warehouseService.ensureSeed();
  await geofenceService.ensureSeed();
  await pricingService.ensureSeed();
  logger.info('Demo seed complete (warehouse, geofence, pricing). Live APIs will not auto-seed.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});
