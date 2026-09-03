const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const leadSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'closed'],
      default: 'new',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Keep submission time for the operator leads inbox (plugin strips timestamps by default)
        ret.createdAt = doc.createdAt;
        ret.updatedAt = doc.updatedAt;
        return ret;
      },
    },
  }
);

leadSchema.plugin(toJSON);
leadSchema.plugin(paginate);

/**
 * @typedef Lead
 */
const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
