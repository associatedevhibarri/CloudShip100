const PACKAGING_MATERIAL_SURCHARGES = {
  UNPACKAGED_BULK: 1.20,
  ORGANIC_SOFT_MATERIAL: 1.05,
  ORGANIC_HARD_MATERIAL: 1.05,
  PAPER: 1.0,
  CARTON_OR_BOX: 1.0,
  CARTON: 1.0,
  BOX: 1.0,
  LIGHT_PLASTIC: 1.02,
  HARD_PLASTIC: 1.0,
  METAL_OR_STEEL: 1.08,
  METAL: 1.08,
  STEEL: 1.08,
};

const PACKAGING_CLASSIFICATION_SURCHARGES = {
  UNPACKAGED_BULK: 1.20,
  BAGGED: 1.0,
  PELLETIZED: 1.0,
  UNWRAPPED: 1.10,
  WRAPPED: 1.0,
  STRAPPED: 1.02,
};

const normalizeKey = (key) => {
  if (!key) return '';
  return String(key)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
};

const getMaterialMultiplier = (packagingMaterial) => {
  const key = normalizeKey(packagingMaterial);
  if (!key) return 1.0;
  return PACKAGING_MATERIAL_SURCHARGES[key] !== undefined
    ? PACKAGING_MATERIAL_SURCHARGES[key]
    : 1.0;
};

const getClassificationMultiplier = (packagingClassification) => {
  const key = normalizeKey(packagingClassification);
  if (!key) return 1.0;
  return PACKAGING_CLASSIFICATION_SURCHARGES[key] !== undefined
    ? PACKAGING_CLASSIFICATION_SURCHARGES[key]
    : 1.0;
};

const calculatePackagingMultiplier = ({
  packagingMaterial = '',
  packagingClassification = '',
  bagWeightKg = null,
  bagTon = null,
} = {}) => {
  const materialMultiplier = getMaterialMultiplier(packagingMaterial);
  const classificationMultiplier = getClassificationMultiplier(packagingClassification);
  const combined = Math.round(materialMultiplier * classificationMultiplier * 100) / 100;

  return {
    packagingMaterial: normalizeKey(packagingMaterial) || 'STANDARD',
    packagingClassification: normalizeKey(packagingClassification) || 'STANDARD',
    materialMultiplier,
    classificationMultiplier,
    combinedPackagingMultiplier: combined,
    bagWeightKg: bagWeightKg ? Number(bagWeightKg) : null,
    bagTon: bagTon ? Number(bagTon) : null,
  };
};

module.exports = {
  PACKAGING_MATERIAL_SURCHARGES,
  PACKAGING_CLASSIFICATION_SURCHARGES,
  getMaterialMultiplier,
  getClassificationMultiplier,
  calculatePackagingMultiplier,
};
