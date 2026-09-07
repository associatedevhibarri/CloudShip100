const woocommerce = require('./woocommerce.adapter');
const shopify = require('./shopify.adapter');
const wix = require('./wix.adapter');
const lovable = require('./lovable.adapter');

const adapters = {
  woocommerce,
  shopify,
  wix,
  lovable,
};

/**
 * @param {string} platform
 */
const getAdapter = (platform) => {
  const key = String(platform || '').toLowerCase();
  const adapter = adapters[key];
  if (!adapter) {
    const err = new Error(`Unsupported e-commerce platform: ${platform}`);
    err.statusCode = 400;
    throw err;
  }
  return adapter;
};

module.exports = {
  getAdapter,
  adapters,
};
