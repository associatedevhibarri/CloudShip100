const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const documentSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['national_id', 'driving_license', 'other'],
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const driverProfileSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    nationalId: {
      type: String,
      trim: true,
    },
    licenseClass: {
      type: String,
      trim: true,
    },
    licenceExpiry: {
      type: Date,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    emergencyPhone: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    restrictions: {
      type: String,
      trim: true,
      default: 'None',
    },
    assignedVehicle: {
      type: String,
      trim: true,
    },
    documents: [documentSchema],
    idDocumentStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Expiring'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

driverProfileSchema.plugin(toJSON);

const DriverProfile = mongoose.model('DriverProfile', driverProfileSchema);

module.exports = DriverProfile;
