const googleMapsService = require('./googleMaps.service');
const { PricingRate } = require('../models');
const seed = require('../seed/pricingRate.seed.json');

const DEFAULT_RATES = seed.reduce((acc, row) => {
  acc[row.mode] = {
    mode: row.mode,
    baseFee: row.baseFee,
    perKm: row.perKm,
    perKg: row.perKg,
    active: row.active !== false,
  };
  return acc;
}, {});

let seeded = false;

const ensureSeed = async () => {
  if (seeded) return;
  const count = await PricingRate.countDocuments();
  if (count === 0) {
    await PricingRate.insertMany(seed);
  }
  seeded = true;
};

/**
 * List all mode rate cards (seeds defaults if empty)
 * @returns {Promise<Object[]>}
 */
const getRates = async () => {
  await ensureSeed();
  const rows = await PricingRate.find().sort('mode');
  return rows.map((r) => r.toJSON());
};

/**
 * Resolve active rates for a mode (DB first, then seed defaults)
 * @param {string} mode
 * @returns {Promise<{baseFee: number, perKm: number, perKg: number}>}
 */
const getRatesForMode = async (mode) => {
  await ensureSeed();
  const doc = await PricingRate.findOne({ mode, active: true });
  if (doc) {
    return { baseFee: doc.baseFee, perKm: doc.perKm, perKg: doc.perKg };
  }
  const fallback = DEFAULT_RATES[mode] || DEFAULT_RATES.Road;
  return { baseFee: fallback.baseFee, perKm: fallback.perKm, perKg: fallback.perKg };
};

/**
 * Upsert rate cards for all provided modes
 * @param {Object[]} rates
 * @param {string|null} updatedBy
 * @returns {Promise<Object[]>}
 */
const upsertRates = async (rates, updatedBy = null) => {
  await ensureSeed();
  await Promise.all(
    rates.map((row) =>
      PricingRate.findOneAndUpdate(
        { mode: row.mode },
        {
          baseFee: row.baseFee,
          perKm: row.perKm,
          perKg: row.perKg,
          active: row.active !== false,
          updatedBy,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
  return getRates();
};

/**
 * Get a live price quote for a shipment.
 * @param {Object} params
 * @param {string} params.pickup
 * @param {string} params.dropoff
 * @param {number} params.weightKg
 * @param {string} params.mode - Road | Air | Maritime | Rail
 */
const getQuote = async ({ pickup, dropoff, weightKg, mode }) => {
  const rates = await getRatesForMode(mode);
  const route = await googleMapsService.getRoute({ origin: pickup, destination: dropoff });

  const price = rates.baseFee + rates.perKm * route.distanceKm + rates.perKg * weightKg;

  return {
    price: Math.round(price * 100) / 100,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    pickup: route.formattedOrigin,
    dropoff: route.formattedDestination,
    mode,
    ratesApplied: rates,
  };
};

module.exports = {
  getQuote,
  getRates,
  upsertRates,
  getRatesForMode,
  DEFAULT_RATES,
};
