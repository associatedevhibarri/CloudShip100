const { FleetAsset } = require('../models');

const nextCode = async (type) => {
  const prefix = String(type || 'FLT')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 6)
    .toUpperCase() || 'FLT';
  const count = await FleetAsset.countDocuments({ type });
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
};

const toPublic = (asset) => {
  const json = asset.toJSON();
  const fields = json.fields && typeof json.fields === 'object' ? json.fields : {};
  return {
    ...fields,
    id: json.code,
    code: fields.code || json.code,
    fleetType: json.type,
    name: json.name || fields.name || json.code,
    status: json.status || fields.status || '',
    type: fields.type || json.type,
  };
};

const queryFleet = async (type) => {
  const filter = type ? { type } : {};
  const rows = await FleetAsset.find(filter).sort({ createdAt: -1 });
  return rows.map(toPublic);
};

const createFleetAsset = async (body) => {
  const { type, name, status, code, id, fields: extraFields, ...rest } = body;
  const asset = await FleetAsset.create({
    code: code || (await nextCode(type)),
    type,
    name: name || rest.name || extraFields?.name || '',
    status: status || rest.status || extraFields?.status || '',
    fields: {
      ...rest,
      ...(code ? { code } : {}),
      ...(extraFields && typeof extraFields === 'object' ? extraFields : {}),
    },
  });
  return toPublic(asset);
};

module.exports = {
  queryFleet,
  createFleetAsset,
};
