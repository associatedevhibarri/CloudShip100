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
  },
  {
    timestamps: true,
  }
);

bookingSchema.plugin(toJSON);
bookingSchema.plugin(paginate);

/**
 * @typedef Booking
 */
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
