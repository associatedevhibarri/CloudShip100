const pricingService = require('./pricing.service');
const googleMapsService = require('./googleMaps.service');
const carriers = require('./carriers');

const getQuotes = async (body) => {
  const shipment = {
    pickup: body.pickup,
    dropoff: body.dropoff,
    weightKg: body.weightKg,
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
  };

  let distanceKm = null;
  let durationMinutes = null;
  let formattedPickup = body.pickup;
  let formattedDropoff = body.dropoff;
  try {
    const route = await googleMapsService.getRoute({ origin: body.pickup, destination: body.dropoff });
    distanceKm = route.distanceKm;
    durationMinutes = route.durationMinutes;
    formattedPickup = route.formattedOrigin;
    formattedDropoff = route.formattedDestination;
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
