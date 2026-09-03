const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const MODES = ['Road', 'Air', 'Maritime', 'Rail'];

const pricingRateSchema = mongoose.Schema(
  {
    mode: {
      type: String,
      enum: MODES,
      required: true,
      unique: true,
    },
    baseFee: {
      type: Number,
      required: true,
      min: 0,
    },
    perKm: {
      type: Number,
      required: true,
      min: 0,
    },
    perKg: {
      type: Number,
      required: true,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.updatedAt = doc.updatedAt;
        ret.createdAt = doc.createdAt;
        return ret;
      },
    },
  }
);

pricingRateSchema.plugin(toJSON);

/**
 * @typedef PricingRate
 */
const PricingRate = mongoose.model('PricingRate', pricingRateSchema);

module.exports = PricingRate;
module.exports.MODES = MODES;
