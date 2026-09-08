const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

/**
 * Idempotent ingest log for every inbound e-com / payment / logistics event.
 * Unique on (platform, externalEventId) prevents double-booking on webhook retries.
 */
const integrationEventSchema = mongoose.Schema(
  {
    platform: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    externalEventId: {
      type: String,
      required: true,
      trim: true,
    },
    storeConnection: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'StoreConnection',
      default: null,
    },
    booking: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Booking',
      default: null,
    },
    status: {
      type: String,
      enum: ['received', 'processing', 'processed', 'ignored', 'failed'],
      default: 'received',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

integrationEventSchema.index({ platform: 1, externalEventId: 1 }, { unique: true });

integrationEventSchema.plugin(toJSON);
integrationEventSchema.plugin(paginate);

/**
 * @typedef IntegrationEvent
 */
const IntegrationEvent = mongoose.model('IntegrationEvent', integrationEventSchema);

module.exports = IntegrationEvent;
