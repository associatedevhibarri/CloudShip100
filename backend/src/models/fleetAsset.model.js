const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const FLEET_TYPES = [
  'yard',
  'vehicle',
  'trailer',
  'equipment',
  'check_in',
  'rail_siding',
  'locomotive',
  'rail_yard',
  'port',
  'airport',
  'aeroplane',
  'aircraft_type',
  'air_equipment',
  'crew',
  'pilot_check_in',
];

const fleetAssetSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: FLEET_TYPES,
      required: true,
      index: true,
    },
    name: { type: String, trim: true },
    status: { type: String, trim: true },
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

fleetAssetSchema.plugin(toJSON);
fleetAssetSchema.plugin(paginate);

const FleetAsset = mongoose.model('FleetAsset', fleetAssetSchema);

module.exports = FleetAsset;
module.exports.FLEET_TYPES = FLEET_TYPES;
