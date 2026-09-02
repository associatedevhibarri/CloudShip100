const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const codedSchema = () => {
  const schema = mongoose.Schema(
    {
      code: { type: String, required: true, unique: true, trim: true },
    },
    {
      timestamps: true,
      strict: false,
      toJSON: {
        transform(doc, ret) {
          ret.id = doc.code;
          delete ret.code;
          if (ret.openedAt) {
            ret.createdAt = ret.openedAt;
          }
          return ret;
        },
      },
    }
  );
  schema.plugin(toJSON);
  return schema;
};

const Parcel = mongoose.model('WarehouseParcel', codedSchema());
const WarehouseBatch = mongoose.model('WarehouseBatch', codedSchema());
const AssignmentSuggestion = mongoose.model('AssignmentSuggestion', codedSchema());
const WarehouseZone = mongoose.model('WarehouseZone', codedSchema());
const DispatchEvent = mongoose.model('DispatchEvent', codedSchema());
const WarehouseRoute = mongoose.model('WarehouseRoute', codedSchema());
const WarehouseDriver = mongoose.model('WarehouseDriver', codedSchema());
const WarehouseMapAsset = mongoose.model('WarehouseMapAsset', codedSchema());

module.exports = {
  Parcel,
  WarehouseBatch,
  AssignmentSuggestion,
  WarehouseZone,
  DispatchEvent,
  WarehouseRoute,
  WarehouseDriver,
  WarehouseMapAsset,
};
