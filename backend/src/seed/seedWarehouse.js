require('../polyfills/slowBuffer');
const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../config/logger');
const warehouseService = require('../services/warehouse.service');

const run = async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  logger.info('Connected to MongoDB');
  await warehouseService.ensureSeed();
  logger.info('Warehouse seed complete');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});
