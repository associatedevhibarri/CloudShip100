const MASS_CONVERSIONS_TO_KG = {
  // Metric
  KG: 1,
  KILOGRAM: 1,
  G: 0.001,
  GRAM: 0.001,
  T: 1000,
  TONNE: 1000,
  METRIC_TON: 1000,

  // US & Imperial
  LB: 0.453592,
  POUND: 0.453592,
  US_TON: 907.185,
  SHORT_TON: 907.185,
  IMPERIAL_TON: 1016.05,
  LONG_TON: 1016.05,
};

const VOLUME_CONVERSIONS_TO_M3 = {
  // Metric volume
  M3: 1,
  CUBIC_METER: 1,
  DM3: 0.001,
  CUBIC_DECIMETER: 0.001,
  L: 0.001,
  LITER: 0.001,
  ML: 0.000001,
  MILLILITER: 0.000001,
  HL: 0.1,
  HECTOLITER: 0.1,

  // Imperial / US volume
  FT3: 0.0283168,
  CUBIC_FOOT: 0.0283168,
  YD3: 0.764555,
  CUBIC_YARD: 0.764555,
  US_GAL: 0.00378541,
  GALLON_US: 0.00378541,
  IMP_GAL: 0.00454609,
  GALLON_IMP: 0.00454609,
  QUART: 0.000946353,
  PINT: 0.000473176,
  FL_OZ: 0.0000295735,

  // Bulk Liquid Containers
  BBL: 0.158987, // 42 US gallons
  BARREL: 0.158987,
  DRUM: 0.20, // 200 L standard drum
  IBC: 1.0, // 1000 L IBC tank
  TANKER_TRUCK: 24.0, // Default 24 m3 tanker
  TANK_CONTAINER: 26.0, // Default 26 m3 ISO tank
};

const AGRICULTURAL_UNITS_TO_KG = {
  BU: 27.2155, // Standard wheat/corn bushel reference weight
  BUSHEL: 27.2155,
  PECK: 6.80388,
  SACK: 50.0,
  BALE: 220.0, // Standard cotton/hay bale
  PICUL: 60.0,
};

const CONTAINER_UNITS = {
  TEU: { volumeM3: 33.2, maxPayloadKg: 21700, defaultWeightKg: 14000 },
  FEU: { volumeM3: 67.7, maxPayloadKg: 26500, defaultWeightKg: 22000 },
  DWT: { isMassTon: true },
  DISPLACEMENT_TON: { isMassTon: true },
  LIGHTSHIP_TON: { isMassTon: true },
};

const GAS_VOLUME_TO_M3 = {
  NM3: 1.0,
  NORMAL_CUBIC_METER: 1.0,
  SCM: 1.0,
  STANDARD_CUBIC_METER: 1.0,
  SCF: 0.0283168,
  STANDARD_CUBIC_FOOT: 0.0283168,
  MMBTU: 28.0, // Gas volumetric equivalent approx in m3
  MBTU: 0.028,
  THERM: 2.8,
  GJ: 26.0,
  KWH: 0.095,
};

const DENSITY_FACTOR_ROAD_KG_PER_M3 = 200; // Standard volumetric weight ratio for road freight

const normalizeUnitKey = (key) => {
  if (!key) return '';
  return String(key)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
};

const convertToKg = (quantity, unit) => {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  const normalizedKey = normalizeUnitKey(unit);

  if (MASS_CONVERSIONS_TO_KG[normalizedKey] !== undefined) {
    return qty * MASS_CONVERSIONS_TO_KG[normalizedKey];
  }
  if (AGRICULTURAL_UNITS_TO_KG[normalizedKey] !== undefined) {
    return qty * AGRICULTURAL_UNITS_TO_KG[normalizedKey];
  }
  if (CONTAINER_UNITS[normalizedKey]?.isMassTon) {
    return qty * 1000;
  }
  return qty; // Default assume kg
};

const convertToM3 = (quantity, unit) => {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  const normalizedKey = normalizeUnitKey(unit);

  if (VOLUME_CONVERSIONS_TO_M3[normalizedKey] !== undefined) {
    return qty * VOLUME_CONVERSIONS_TO_M3[normalizedKey];
  }
  if (GAS_VOLUME_TO_M3[normalizedKey] !== undefined) {
    return qty * GAS_VOLUME_TO_M3[normalizedKey];
  }
  if (CONTAINER_UNITS[normalizedKey]?.volumeM3) {
    return qty * CONTAINER_UNITS[normalizedKey].volumeM3;
  }
  return 0;
};

const normalizeCargoUnits = (payload = {}) => {
  const {
    cargoCategory = 'SOLID',
    quantity = 1,
    unit = 'KG',
    weightKg,
    volumeM3,
    lengthCm,
    widthCm,
    heightCm,
  } = payload;

  let calculatedWeightKg = Number(weightKg) || 0;
  let calculatedVolumeM3 = Number(volumeM3) || 0;

  const qty = Number(quantity) || 1;
  const unitKey = normalizeUnitKey(unit);

  // 1. Calculate from length x width x height if provided
  if (Number(lengthCm) > 0 && Number(widthCm) > 0 && Number(heightCm) > 0) {
    const dimVolumeM3 = (Number(lengthCm) * Number(widthCm) * Number(heightCm)) / 1000000;
    if (dimVolumeM3 > calculatedVolumeM3) {
      calculatedVolumeM3 = dimVolumeM3;
    }
  }

  // 2. Unit conversion based on category
  const convertedMass = convertToKg(qty, unitKey);
  const convertedVol = convertToM3(qty, unitKey);

  if (convertedMass > 0) {
    calculatedWeightKg = Math.max(calculatedWeightKg, convertedMass);
  }

  if (convertedVol > 0) {
    calculatedVolumeM3 = Math.max(calculatedVolumeM3, convertedVol);
  }

  // Handle special container defaults
  if (CONTAINER_UNITS[unitKey]) {
    const container = CONTAINER_UNITS[unitKey];
    if (container.defaultWeightKg && (calculatedWeightKg <= 0 || calculatedWeightKg === qty)) {
      calculatedWeightKg = qty * container.defaultWeightKg;
    }
  }

  // Default fallback weight if zero
  if (calculatedWeightKg <= 0) {
    calculatedWeightKg = 1;
  }

  // 3. Volumetric Weight Calculation
  const volumetricWeightKg = calculatedVolumeM3 * DENSITY_FACTOR_ROAD_KG_PER_M3;
  const chargeableWeightKg = Math.max(calculatedWeightKg, volumetricWeightKg);

  return {
    cargoCategory,
    quantity: qty,
    unit: unitKey || 'KG',
    actualWeightKg: Math.round(calculatedWeightKg * 100) / 100,
    volumeM3: Math.round(calculatedVolumeM3 * 1000) / 1000,
    volumetricWeightKg: Math.round(volumetricWeightKg * 100) / 100,
    chargeableWeightKg: Math.round(chargeableWeightKg * 100) / 100,
  };
};

module.exports = {
  MASS_CONVERSIONS_TO_KG,
  VOLUME_CONVERSIONS_TO_M3,
  AGRICULTURAL_UNITS_TO_KG,
  CONTAINER_UNITS,
  GAS_VOLUME_TO_M3,
  convertToKg,
  convertToM3,
  normalizeCargoUnits,
};
