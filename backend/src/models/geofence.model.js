const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const geofenceSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    scope: {
      type: String,
      enum: ['country', 'province', 'radius'],
      required: true,
    },
    region: {
      type: String,
      required: true,
      trim: true,
    },
    radiusKm: {
      type: Number,
      default: null,
      min: 0,
    },
    rule: {
      type: String,
      required: true,
      trim: true,
    },
    exclusions: {
      type: [String],
      default: [],
    },
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = doc.code;
        delete ret.code;
        return ret;
      },
    },
  }
);

geofenceSchema.plugin(toJSON);

/**
 * @typedef Geofence
 */
const Geofence = mongoose.model('Geofence', geofenceSchema);

module.exports = Geofence;
