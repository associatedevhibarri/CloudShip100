const config = require('../../config/config');
const { httpJson } = require('./http');

const KM_PER_MILE = 1.609344;
const METERS_PER_KM = 1000;
const DEFAULT_ROAD_CURVATURE = 1.28;

const BUILDING_ACCESS_MULTIPLIERS = {
  // Agricultural
  AGRICULTURAL: 1.15,
  FARM: 1.15,
  RANCH: 1.15,
  SMALL_HOLD: 1.15,
  FARMHOUSE: 1.15,
  FARMSTEAD: 1.15,
  BARN: 1.15,
  SILO: 1.15,
  RURAL_COLLECTION_POINT: 1.15,
  PROCESSING_PLANT: 1.10,
  GREENHOUSE_OR_NURSERY: 1.10,
  SHED: 1.10,
  FARM_DEPOT_OR_COOP: 1.12,
  LOADING_RAMP: 1.10,

  // Industrial
  INDUSTRIAL: 1.05,
  INDUSTRIAL_PARK: 1.02,
  WAREHOUSE: 1.0,
  DISTRIBUTION_CENTER: 1.0,
  FACTORY: 1.05,
  LOGISTICS_HUB: 1.0,
  MINING_FACILITY: 1.20,
  REFINERY: 1.15,
  YARD: 1.05,
  CONTAINER_DEPOT: 1.05,

  // Commercial
  COMMERCIAL: 1.0,
  OFFICE: 1.0,
  OFFICE_TOWER: 1.0,
  RETAIL_STORE: 1.0,
  SHOPPING_MALL: 1.02,
  SHOWROOM: 1.0,
  HOTEL: 1.05,
  RESTAURANT: 1.05,

  // Residential
  RESIDENTIAL: 1.0,
  HOUSE: 1.0,
  APARTMENT: 1.05,
  CONDOMINIUM: 1.05,
  DUPLEX_TRIPIEX: 1.0,
  TOWNHOUSE: 1.02,
  VILLA: 1.0,
  MOBILE_HOME: 1.05,
  RESIDENTIAL_COMPLEX: 1.02,
  COMMUNITY_ESTATE: 1.02,

  // Mixed-Use
  MIXED_USE: 1.02,

  // Storage
  STORAGE: 1.05,
  CONTAINER_STORAGE_SITE: 1.05,
  PACKAGING_FACILITY: 1.0,
  BONDED_WAREHOUSE: 1.10,
  FREESTORE_WAREHOUSE: 1.05,

  // Temporary Structures
  TEMPORARY_STRUCTURES: 1.20,
  TEMPORARY_BUILDING: 1.20,
  MODULAR_BUILDING: 1.20,
  CONSTRUCTION_SITE_OFFICE: 1.25,
  SHEDS_TEMP: 1.15,
};

const normalizeBuildingKey = (key) => {
  if (!key) return '';
  return String(key)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
};

const getBuildingAccessMultiplier = (buildingType) => {
  const normalized = normalizeBuildingKey(buildingType);
  if (!normalized) return 1.0;
  if (BUILDING_ACCESS_MULTIPLIERS[normalized] !== undefined) {
    return BUILDING_ACCESS_MULTIPLIERS[normalized];
  }
  const entries = Object.entries(BUILDING_ACCESS_MULTIPLIERS).sort((a, b) => b[0].length - a[0].length);
  for (const [key, value] of entries) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  return 1.0;
};

const milesToKm = (miles) => Number(miles) * KM_PER_MILE;

const metersToKm = (meters) => Number(meters) / METERS_PER_KM;

const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateFallbackDistanceKm = (origin, destination) => {
  if (origin && origin.lat != null && origin.lng != null && destination && destination.lat != null && destination.lng != null) {
    const straightKm = haversineDistanceKm(
      Number(origin.lat),
      Number(origin.lng),
      Number(destination.lat),
      Number(destination.lng)
    );
    return Math.max(1, Math.round(straightKm * DEFAULT_ROAD_CURVATURE * 100) / 100);
  }
  return 10.0; // Default nominal distance in km if no coordinates available
};

const fetchGoogleDistanceMatrixKm = async (originStr, destStr, apiKey) => {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destStr)}&key=${apiKey}`;
  const response = await httpJson(url);
  if (
    response &&
    response.status === 'OK' &&
    response.rows &&
    response.rows[0] &&
    response.rows[0].elements &&
    response.rows[0].elements[0] &&
    response.rows[0].elements[0].status === 'OK'
  ) {
    const element = response.rows[0].elements[0];
    const distanceMeters = element.distance.value;
    const durationSeconds = element.duration ? element.duration.value : null;
    return {
      distanceKm: Math.round(metersToKm(distanceMeters) * 100) / 100,
      durationMinutes: durationSeconds ? Math.ceil(durationSeconds / 60) : null,
      provider: 'google_maps',
    };
  }
  return null;
};

const calculateDistanceKm = async (origin, destination, options = {}) => {
  const originStr = typeof origin === 'string' ? origin : origin.raw || origin.street || '';
  const destStr = typeof destination === 'string' ? destination : destination.raw || destination.street || '';

  const collectionBuilding = options.collectionBuildingType || (origin && origin.buildingType) || '';
  const deliveryBuilding = options.deliveryBuildingType || (destination && destination.buildingType) || '';

  const originMultiplier = getBuildingAccessMultiplier(collectionBuilding);
  const destMultiplier = getBuildingAccessMultiplier(deliveryBuilding);
  const combinedAccessMultiplier = Math.round(originMultiplier * destMultiplier * 100) / 100;

  let baseDistanceKm = null;
  let durationMinutes = null;
  let provider = 'fallback_haversine';

  const apiKey = options.googleApiKey || process.env.GOOGLE_MAPS_API_KEY || (config.google && config.google.mapsApiKey);

  if (apiKey && originStr && destStr) {
    try {
      const googleResult = await fetchGoogleDistanceMatrixKm(originStr, destStr, apiKey);
      if (googleResult) {
        baseDistanceKm = googleResult.distanceKm;
        durationMinutes = googleResult.durationMinutes;
        provider = googleResult.provider;
      }
    } catch (err) {
      // Fallback on API failure
    }
  }

  if (baseDistanceKm == null) {
    baseDistanceKm = calculateFallbackDistanceKm(origin, destination);
  }

  const effectiveBillableKm = Math.round(baseDistanceKm * combinedAccessMultiplier * 100) / 100;

  return {
    baseDistanceKm,
    effectiveBillableKm,
    unit: 'km',
    durationMinutes,
    provider,
    collectionBuilding,
    deliveryBuilding,
    originAccessMultiplier: originMultiplier,
    destinationAccessMultiplier: destMultiplier,
    combinedAccessMultiplier,
  };
};

module.exports = {
  BUILDING_ACCESS_MULTIPLIERS,
  getBuildingAccessMultiplier,
  milesToKm,
  metersToKm,
  haversineDistanceKm,
  calculateFallbackDistanceKm,
  calculateDistanceKm,
};
