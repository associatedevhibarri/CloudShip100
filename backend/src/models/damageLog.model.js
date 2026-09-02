const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const damageLogSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    driverProfile: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'DriverProfile',
      required: true,
      index: true,
    },
    parcel: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Parcel',
    },
    trip: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Trip',
    },
    severity: {
      type: String,
      enum: ['minor', 'major'],
      default: 'minor',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved'],
      default: 'open',
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

damageLogSchema.index({ driverProfile: 1, code: 1 }, { unique: true });
damageLogSchema.plugin(toJSON);

const DamageLog = mongoose.model('DamageLog', damageLogSchema);
module.exports = DamageLog;
