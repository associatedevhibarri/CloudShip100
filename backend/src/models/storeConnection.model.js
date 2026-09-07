const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const storeConnectionSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['woocommerce', 'shopify', 'wix', 'lovable'],
      required: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeUrl: {
      type: String,
      trim: true,
      default: '',
    },
    /** Encrypted blob — never return raw secrets via API */
    credentialsEncrypted: {
      type: String,
      required: true,
      private: true,
    },
    webhookSecret: {
      type: String,
      trim: true,
      default: '',
      private: true,
    },
    /** Public key merchants embed (Lovable / universal SDK) */
    publicApiKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'disconnected'],
      default: 'active',
    },
    settings: {
      autoBookOnPaid: { type: Boolean, default: true },
      defaultMode: {
        type: String,
        enum: ['Road', 'Air', 'Maritime', 'Rail'],
        default: 'Road',
      },
      currency: { type: String, default: 'ZAR', uppercase: true },
      pickupAddress: { type: String, trim: true, default: '' },
    },
    lastWebhookAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

storeConnectionSchema.index({ company: 1, platform: 1, storeUrl: 1 });

storeConnectionSchema.plugin(toJSON);
storeConnectionSchema.plugin(paginate);

/**
 * @typedef StoreConnection
 */
const StoreConnection = mongoose.model('StoreConnection', storeConnectionSchema);

module.exports = StoreConnection;
