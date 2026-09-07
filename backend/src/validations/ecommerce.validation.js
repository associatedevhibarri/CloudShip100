const Joi = require('joi');
const { objectId } = require('./custom.validation');

const connectStore = {
  body: Joi.object().keys({
    platform: Joi.string().valid('woocommerce', 'shopify', 'wix', 'lovable').required(),
    storeName: Joi.string().required(),
    storeUrl: Joi.string().allow('').optional(),
    credentials: Joi.object().required(),
    webhookSecret: Joi.string().allow('').optional(),
    settings: Joi.object()
      .keys({
        autoBookOnPaid: Joi.boolean(),
        defaultMode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail'),
        currency: Joi.string().length(3),
        pickupAddress: Joi.string().allow(''),
      })
      .optional(),
  }),
};

const updateStore = {
  params: Joi.object().keys({
    connectionId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      storeName: Joi.string(),
      storeUrl: Joi.string().allow(''),
      status: Joi.string().valid('active', 'paused', 'disconnected'),
      credentials: Joi.object(),
      webhookSecret: Joi.string(),
      settings: Joi.object(),
    })
    .min(1),
};

const connectionIdParam = {
  params: Joi.object().keys({
    connectionId: Joi.string().custom(objectId).required(),
  }),
};

const marketplaceQuote = {
  body: Joi.object().keys({
    connectionId: Joi.string().custom(objectId).optional(),
    pickup: Joi.string().required(),
    dropoff: Joi.string().required(),
    weightKg: Joi.number().positive().required(),
    mode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail'),
    currency: Joi.string().length(3),
    preferredPartner: Joi.string(),
  }),
};

const confirmPayment = {
  params: Joi.object().keys({
    paymentIntentId: Joi.string().required(),
  }),
};

module.exports = {
  connectStore,
  updateStore,
  connectionIdParam,
  marketplaceQuote,
  confirmPayment,
};
