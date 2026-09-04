const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const kycDocumentSchema = mongoose.Schema(
  {
    company: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Company',
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    mimeType: {
      type: String,
      default: null,
    },
    size: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['compliant', 'expiring', 'pending', 'non_compliant'],
      default: 'pending',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

kycDocumentSchema.plugin(toJSON);
kycDocumentSchema.plugin(paginate);

/**
 * @typedef KycDocument
 */
const KycDocument = mongoose.model('KycDocument', kycDocumentSchema);

module.exports = KycDocument;
