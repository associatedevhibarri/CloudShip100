const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const timelineStepSchema = mongoose.Schema(
  {
    stage: { type: String, required: true },
    label: { type: String, required: true },
    timestamp: { type: Date, default: null },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const bookingSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Company',
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    distanceKm: {
      type: Number,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'completed', 'history'],
      default: 'pending',
    },
    mode: {
      type: String,
      enum: ['Road', 'Air', 'Maritime', 'Rail'],
      required: true,
    },
    cargo: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
    },
    pickup: {
      type: String,
      required: true,
      trim: true,
    },
    dropoff: {
      type: String,
      required: true,
      trim: true,
    },
    timeline: {
      type: [timelineStepSchema],
      default: [],
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
    // Marketplace / e-commerce bridge fields (Stage 1)
    source: {
      type: String,
      enum: ['portal', 'woocommerce', 'shopify', 'wix', 'lovable', 'api'],
      default: 'portal',
    },
    storeConnection: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'StoreConnection',
      default: null,
    },
    externalOrderId: {
      type: String,
      trim: true,
      default: null,
    },
    quoteId: {
      type: String,
      trim: true,
      default: null,
    },
    carrierCost: {
      type: Number,
      default: null,
    },
    marginAmount: {
      type: Number,
      default: null,
    },
    marginPercent: {
      type: Number,
      default: null,
    },
    quotedPrice: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ZAR',
    },
    paymentStatus: {
      type: String,
      enum: ['not_required', 'awaiting', 'paid', 'failed', 'refunded'],
      default: 'not_required',
    },
    paymentIntentId: {
      type: String,
      trim: true,
      default: null,
    },
    logisticsBookingRef: {
      type: String,
      trim: true,
      default: null,
    },
    trackingNumber: {
      type: String,
      trim: true,
      default: null,
    },
    selectedPartner: {
      type: String,
      trim: true,
      default: null,
    },
    selectedService: {
      type: String,
      trim: true,
      default: null,
    },
    weightKg: {
      type: Number,
      default: null,
    },
    buyerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    buyerPhone: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index(
  { source: 1, externalOrderId: 1, storeConnection: 1 },
  {
    unique: true,
    partialFilterExpression: { externalOrderId: { $type: 'string' } },
  }
);

bookingSchema.plugin(toJSON);
bookingSchema.plugin(paginate);

/**
 * @typedef Booking
 */
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
