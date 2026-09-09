const { parseAddress } = require('../../services/carriers/address');
const googleMapsService = require('../../services/googleMaps.service');
const logger = require('../../config/logger');

const roundMoney = (n) => Math.round(Number(n) * 100) / 100;

const settingsOf = (store) => {
  if (!store) return {};
  const raw = store.settings;
  if (!raw) return {};
  if (typeof raw.toObject === 'function') return raw.toObject();
  return raw;
};

const pickupLocations = (settings) => {
  const rows = Array.isArray(settings.pickupLocations) ? settings.pickupLocations.filter((row) => row && row.address) : [];
  if (rows.length) return rows;
  if (settings.pickupAddress) {
    return [{ name: 'Main warehouse', address: settings.pickupAddress, isDefault: true }];
  }
  return [];
};

const defaultPickup = (settings) => {
  const rows = pickupLocations(settings);
  return rows.find((row) => row.isDefault) || rows[0] || null;
};

const pickClosestPickup = async (settings, dropoff) => {
  const rows = pickupLocations(settings);
  if (!rows.length) return null;
  if (rows.length === 1 || settings.pickupStrategy !== 'closest') {
    return defaultPickup(settings);
  }

  const scored = await Promise.all(
    rows.map(async (loc) => {
      try {
        const route = await googleMapsService.getRoute({ origin: loc.address, destination: dropoff });
        return { loc, km: route.distanceKm };
      } catch (err) {
        logger.warn(`Closest pickup lookup failed for ${loc.address}: ${err.message}`);
        return { loc, km: Number.POSITIVE_INFINITY };
      }
    })
  );
  scored.sort((a, b) => a.km - b.km);
  if (!Number.isFinite(scored[0].km)) return defaultPickup(settings);
  return scored[0].loc;
};

const matchPickup = (settings, address) => {
  const target = String(address || '').trim().toLowerCase();
  if (!target) return null;
  return pickupLocations(settings).find((row) => String(row.address || '').trim().toLowerCase() === target) || null;
};

const resolvePickup = async ({ settings, fallbackPickup, dropoff, lockPickup }) => {
  if (lockPickup) {
    const address = String(fallbackPickup || '').trim();
    const named = matchPickup(settings || {}, address);
    return { address, name: (named && named.name) || 'Warehouse' };
  }
  const chosen = await pickClosestPickup(settings || {}, dropoff);
  if (chosen && chosen.address) {
    return { address: chosen.address, name: chosen.name || 'Warehouse' };
  }
  return { address: String(fallbackPickup || '').trim(), name: 'Warehouse' };
};

const applyShopMarkup = (cloudshipPrice, extraPercent) => {
  const base = Number(cloudshipPrice);
  const percent = Number(extraPercent) || 0;
  const shopMarginAmount = roundMoney(base * (percent / 100));
  return {
    shopMarginPercent: percent,
    shopMarginAmount,
    quotedPrice: roundMoney(base + shopMarginAmount),
  };
};

const countryFromAddress = (raw) => {
  try {
    return parseAddress(raw).countryCode || '';
  } catch (err) {
    return '';
  }
};

const tableRateMatches = (rate, { weightKg, dropoff }) => {
  const weight = Number(weightKg);
  const min = Number(rate.minWeightKg);
  const max = rate.maxWeightKg == null || rate.maxWeightKg === '' ? null : Number(rate.maxWeightKg);
  if (Number.isFinite(min) && weight < min) return false;
  if (Number.isFinite(max) && weight > max) return false;
  const country = String(rate.country || '').trim().toUpperCase();
  if (country) {
    const dest = countryFromAddress(dropoff);
    if (dest && dest !== country && dest !== country.slice(0, 2)) return false;
  }
  return Number.isFinite(Number(rate.price)) && Number(rate.price) >= 0;
};

const matchingTableRates = (settings, shipment) => {
  const rows = Array.isArray(settings.tableRates) ? settings.tableRates : [];
  return rows.filter((rate) => rate && tableRateMatches(rate, shipment));
};

module.exports = {
  settingsOf,
  pickupLocations,
  defaultPickup,
  resolvePickup,
  applyShopMarkup,
  matchingTableRates,
  roundMoney,
};
