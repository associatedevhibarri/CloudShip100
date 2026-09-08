const { parseAddress, defaultParcel } = require('./address');

const IMPERIAL_DOMESTIC = new Set(['US', 'PR', 'VI', 'GU', 'AS', 'MP']);

const usesImperialUnits = (origin, dest) => {
  const from = origin && origin.countryCode;
  const to = dest && dest.countryCode;
  if (from === 'CA' && to === 'CA') return true;
  return IMPERIAL_DOMESTIC.has(from) && IMPERIAL_DOMESTIC.has(to);
};

const cmToIn = (cm) => Math.max(1, Math.round(Number(cm) / 2.54));
const kgToLb = (kg) => Math.max(0.1, Math.round(Number(kg) * 2.20462 * 10) / 10);

const packageLineItem = (shipment) => {
  const parcel = defaultParcel(shipment);
  const origin = parseAddress(shipment.pickup);
  const dest = parseAddress(shipment.dropoff);
  if (usesImperialUnits(origin, dest)) {
    return {
      weight: { units: 'LB', value: kgToLb(parcel.weightKg) },
      dimensions: {
        length: cmToIn(parcel.lengthCm),
        width: cmToIn(parcel.widthCm),
        height: cmToIn(parcel.heightCm),
        units: 'IN',
      },
    };
  }
  return {
    weight: { units: 'KG', value: parcel.weightKg },
    dimensions: {
      length: parcel.lengthCm,
      width: parcel.widthCm,
      height: parcel.heightCm,
      units: 'CM',
    },
  };
};

module.exports = {
  packageLineItem,
};
