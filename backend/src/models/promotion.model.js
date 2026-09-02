const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const promotionSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    tag: {
      type: String,
      default: 'Promotion',
    },
    postedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

promotionSchema.plugin(toJSON);
promotionSchema.plugin(paginate);

/**
 * @typedef Promotion
 */
const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;
