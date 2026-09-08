const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

/**
 * Snapshot of rates shown at checkout. Bookings must reference a quoteId
 * so the charged price matches what the shopper saw (Anje: pricing up front).
 */
const shipmentQuoteSchema = mongoose.Schema(
  {
    quoteId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    storeConnection: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'StoreConnection',
      default: null,
    },
    company: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Company',
      default: null,
    },
    pickup: { type: String, required: true, trim: true },
    dropoff: { type: String, required: true, trim: true },
    weightKg: { type: Number, required: true },
    mode: {
      type: String,
      enum: ['Road', 'Air', 'Maritime', 'Rail'],
      default: 'Road',
    },
    currency: { type: String, default: 'ZAR', uppercase: true },
    options: [
      {
        partner: String,
        service: String,
        carrierCost: Number,
        marginAmount: Number,
        marginPercent: Number,
        quotedPrice: Number,
        etaHours: Number,
        currency: String,
      },
    ],
    selectedPartner: { type: String, default: null },
    selectedService: { type: String, default: null },
    carrierCost: { type: Number, required: true },
    marginAmount: { type: Number, required: true },
    marginPercent: { type: Number, required: true },
    quotedPrice: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

shipmentQuoteSchema.plugin(toJSON);

/**
 * @typedef ShipmentQuote
 */
const ShipmentQuote = mongoose.model('ShipmentQuote', shipmentQuoteSchema);

module.exports = ShipmentQuote;
