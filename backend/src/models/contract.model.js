const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const contractSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Company',
      required: true,
    },
    booking: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Booking',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    pickup: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    terms: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending_signature', 'expired'],
      default: 'pending_signature',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

contractSchema.plugin(toJSON);
contractSchema.plugin(paginate);

/**
 * @typedef Contract
 */
const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;
