const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const parcelSchema = mongoose.Schema(
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
    trip: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Trip',
    },
    status: {
      type: String,
      enum: ['assigned', 'picked_up', 'in_transit', 'delivered'],
      default: 'assigned',
    },
    weight: {
      type: String,
      trim: true,
    },
    cargo: {
      type: String,
      required: true,
      trim: true,
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
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    clientName: {
      type: String,
      trim: true,
    },
    clientOrderId: {
      type: String,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

parcelSchema.index({ driverProfile: 1, code: 1 }, { unique: true });
parcelSchema.plugin(toJSON);

const Parcel = mongoose.model('Parcel', parcelSchema);
module.exports = Parcel;
