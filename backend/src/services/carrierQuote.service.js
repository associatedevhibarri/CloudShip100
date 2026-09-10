const pricingService = require('./pricing.service');
const googleMapsService = require('./googleMaps.service');
const carriers = require('./carriers');
const { calculateDistanceKm } = require('./carriers/distance');
const { normalizeCargoUnits } = require('./carriers/units');

const getQuotes = async (body) => {
  const normalizedUnits = normalizeCargoUnits({
    cargoCategory: body.cargoCategory,
    quantity: body.quantity,
    unit: body.unit,
    weightKg: body.weightKg,
    volumeM3: body.volumeM3,
    lengthCm: body.lengthCm,
    widthCm: body.widthCm,
    heightCm: body.heightCm,
  });

  const distanceResult = await calculateDistanceKm(body.pickup, body.dropoff, {
    collectionBuildingType: body.collectionBuildingType,
    deliveryBuildingType: body.deliveryBuildingType,
  });

  const shipment = {
    pickup: body.pickup,
    dropoff: body.dropoff,
    weightKg: normalizedUnits.chargeableWeightKg,
    mode: body.mode,
    cargo: body.cargo,
    lengthCm: body.lengthCm,
    widthCm: body.widthCm,
    heightCm: body.heightCm,
    declaredValue: body.declaredValue,
    pickupPhone: body.pickupPhone,
    dropoffPhone: body.dropoffPhone,
    pickupName: body.pickupName,
    dropoffName: body.dropoffName,
    pickupDate: body.pickupDate,
    collectionBuildingType: body.collectionBuildingType,
    deliveryBuildingType: body.deliveryBuildingType,
    normalizedUnits,
    distanceResult,
  };

  let distanceKm = distanceResult.effectiveBillableKm;
  let durationMinutes = distanceResult.durationMinutes;
  let formattedPickup = body.pickup;
  let formattedDropoff = body.dropoff;
  try {
    const route = await googleMapsService.getRoute({ origin: body.pickup, destination: body.dropoff });
    if (route && route.distanceKm) {
      distanceKm = Math.round(route.distanceKm * distanceResult.combinedAccessMultiplier * 100) / 100;
      durationMinutes = route.durationMinutes;
      formattedPickup = route.formattedOrigin;
      formattedDropoff = route.formattedDestination;
    }
  } catch (mapsErr) {
    if (mapsErr && mapsErr.message) {
      formattedPickup = body.pickup;
    }
  }

  const quoted = await carriers.quoteAll(shipment);
  const { partners, cheapest, fastest } = carriers.publicQuotes(quoted);

  let fallback = null;
  if (!cheapest && body.mode) {
    try {
      fallback = await pricingService.getQuote(body);
    } catch (pricingErr) {
      if (pricingErr) {
        fallback = null;
      }
    }
  }

  let price = null;
  if (cheapest) {
    price = cheapest.sellPrice;
  } else if (fallback) {
    price = fallback.price;
  }

  let outDistance = distanceKm;
  if (outDistance == null && fallback) {
    outDistance = fallback.distanceKm;
  }
  let outDuration = durationMinutes;
  if (outDuration == null && fallback) {
    outDuration = fallback.durationMinutes;
  }

  return {
    pickup: formattedPickup,
    dropoff: formattedDropoff,
    weightKg: body.weightKg,
    mode: body.mode,
    distanceKm: outDistance,
    durationMinutes: outDuration,
    price,
    currency: (cheapest && cheapest.currency) || 'ZAR',
    partners,
    selected: cheapest,
    fastest,
  };
};

module.exports = {
  getQuotes,
};
