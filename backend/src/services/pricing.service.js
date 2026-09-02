const googleMapsService = require('./googleMaps.service');

// Per-mode rate card: base handling fee + per-km + per-kg. No external pricing data source —
// this is a deliberately simple formula, not a real freight-rate engine.
const RATE_TABLE = {
  Road: { baseFee: 50, perKm: 1.2, perKg: 0.5 },
  Air: { baseFee: 200, perKm: 3.5, perKg: 2 },
  Maritime: { baseFee: 150, perKm: 0.3, perKg: 0.8 },
  Rail: { baseFee: 80, perKm: 0.6, perKg: 0.6 },
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
  const rates = RATE_TABLE[mode] || RATE_TABLE.Road;
  const route = await googleMapsService.getRoute({ origin: pickup, destination: dropoff });

  const price = rates.baseFee + rates.perKm * route.distanceKm + rates.perKg * weightKg;

  return {
    price: Math.round(price * 100) / 100,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    pickup: route.formattedOrigin,
    dropoff: route.formattedDestination,
  };
};

module.exports = {
  getQuote,
};
