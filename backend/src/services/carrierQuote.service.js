const pricingService = require('./pricing.service');
const googleMapsService = require('./googleMaps.service');
const carriers = require('./carriers');
const { calculateDistanceKm } = require('./carriers/distance');
const { normalizeCargoUnits } = require('./carriers/units');
const { calculateDimensions, calculateSpecialHandlingMultiplier } = require('./carriers/formSpecial');

const getQuotes = async (body) => {
  const dimensionInfo = calculateDimensions({
    length: body.lengthCm || body.length,
    width: body.widthCm || body.width,
    height: body.heightCm || body.height,
    unit: body.dimensionUnit || 'CM',
  });

  const handlingMultiplier = calculateSpecialHandlingMultiplier({
    cargoForm: body.cargoForm || body.form || 'SOLID',
    flammable: Boolean(body.flammable),
    perishable: Boolean(body.perishable),
    fragile: Boolean(body.fragile),
    extraLabour: Boolean(body.extraLabour || body.requiresAdditionalLabour),
    specialClassifications: body.specialClassifications,
  });

  const normalizedUnits = normalizeCargoUnits({
    cargoCategory: body.cargoCategory,
    quantity: body.quantity,
    unit: body.unit,
    weightKg: body.weightKg,
    volumeM3: Math.max(body.volumeM3 || 0, dimensionInfo.volumeM3),
    lengthCm: dimensionInfo.lengthCm,
    widthCm: dimensionInfo.widthCm,
    heightCm: dimensionInfo.heightCm,
  });

  const distanceResult = await calculateDistanceKm(body.pickup, body.dropoff, {
    collectionBuildingType: body.collectionBuildingType,
    deliveryBuildingType: body.deliveryBuildingType,
  });

  const finalChargeableWeightKg = Math.round(normalizedUnits.chargeableWeightKg * handlingMultiplier * 100) / 100;

  const shipment = {
    pickup: body.pickup,
    dropoff: body.dropoff,
    weightKg: finalChargeableWeightKg,
    mode: body.mode,
    cargo: body.cargo,
    lengthCm: dimensionInfo.lengthCm,
    widthCm: dimensionInfo.widthCm,
    heightCm: dimensionInfo.heightCm,
    declaredValue: body.declaredValue,
    pickupPhone: body.pickupPhone,
    dropoffPhone: body.dropoffPhone,
    pickupName: body.pickupName,
    dropoffName: body.dropoffName,
    pickupDate: body.pickupDate,
    collectionBuildingType: body.collectionBuildingType,
    deliveryBuildingType: body.deliveryBuildingType,
    dimensionInfo,
    handlingMultiplier,
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
