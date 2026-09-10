const CM_PER_METER = 100;
const CM_PER_INCH = 2.54;
const CM_PER_FOOT = 30.48;

const SPECIAL_CLASSIFICATION_SURCHARGES = {
  FLAMMABLE: 1.25,
  PERISHABLE: 1.20,
  FRAGILE: 1.10,
  EXTRA_LABOUR: 1.15,
  REQUIRES_ADDITIONAL_LABOUR_FOR_LOADING: 1.15,
  STANDARD: 1.0,
};

const FORM_SURCHARGES = {
  SOLID: 1.0,
  LIQUID: 1.10,
  GAS: 1.15,
};

const normalizeDimensionToCm = (value, unit = 'CM') => {
  const val = Number(value);
  if (!Number.isFinite(val) || val <= 0) return 0;
  const normalizedUnit = String(unit).toUpperCase().trim();

  switch (normalizedUnit) {
    case 'M':
    case 'METER':
    case 'METERS':
      return val * CM_PER_METER;
    case 'IN':
    case 'INCH':
    case 'INCHES':
      return val * CM_PER_INCH;
    case 'FT':
    case 'FOOT':
    case 'FEET':
      return val * CM_PER_FOOT;
    case 'CM':
    case 'CENTIMETER':
    default:
      return val;
  }
};

const calculateDimensions = ({ length = 20, width = 20, height = 20, unit = 'CM' } = {}) => {
  const lengthCm = Math.round(normalizeDimensionToCm(length, unit) * 100) / 100;
  const widthCm = Math.round(normalizeDimensionToCm(width, unit) * 100) / 100;
  const heightCm = Math.round(normalizeDimensionToCm(height, unit) * 100) / 100;

  const volumeM3 = Math.round(((lengthCm * widthCm * heightCm) / 1000000) * 1000) / 1000;

  return {
    lengthCm,
    widthCm,
    heightCm,
    volumeM3,
    unit: String(unit).toUpperCase().trim(),
  };
};

const calculateSpecialHandlingMultiplier = ({
  cargoForm = 'SOLID',
  flammable = false,
  perishable = false,
  fragile = false,
  extraLabour = false,
  specialClassifications = [],
} = {}) => {
  const formKey = String(cargoForm).toUpperCase().trim();
  let multiplier = FORM_SURCHARGES[formKey] || 1.0;

  if (flammable) multiplier *= SPECIAL_CLASSIFICATION_SURCHARGES.FLAMMABLE;
  if (perishable) multiplier *= SPECIAL_CLASSIFICATION_SURCHARGES.PERISHABLE;
  if (fragile) multiplier *= SPECIAL_CLASSIFICATION_SURCHARGES.FRAGILE;
  if (extraLabour) multiplier *= SPECIAL_CLASSIFICATION_SURCHARGES.EXTRA_LABOUR;

  if (Array.isArray(specialClassifications)) {
    specialClassifications.forEach((cls) => {
      const key = String(cls).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      if (SPECIAL_CLASSIFICATION_SURCHARGES[key]) {
        multiplier *= SPECIAL_CLASSIFICATION_SURCHARGES[key];
      }
    });
  }

  return Math.round(multiplier * 100) / 100;
};

module.exports = {
  SPECIAL_CLASSIFICATION_SURCHARGES,
  FORM_SURCHARGES,
  normalizeDimensionToCm,
  calculateDimensions,
  calculateSpecialHandlingMultiplier,
};
