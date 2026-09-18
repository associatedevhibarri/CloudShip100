const { Geofence, FleetAsset } = require('../models');
const { WarehouseZone } = require('../models/warehouse.model');
const logger = require('../config/logger');

const WMO = {
  0: { condition: 'Clear', severity: 'low', impact: 'No weather delay expected.' },
  1: { condition: 'Mainly clear', severity: 'low', impact: 'No weather delay expected.' },
  2: { condition: 'Partly cloudy', severity: 'low', impact: 'No weather delay expected.' },
  3: { condition: 'Overcast', severity: 'low', impact: 'Watch for reduced visibility.' },
  45: { condition: 'Fog', severity: 'medium', impact: 'Reduced visibility at the yard.' },
  48: { condition: 'Depositing rime fog', severity: 'medium', impact: 'Reduced visibility at the yard.' },
  51: { condition: 'Light drizzle', severity: 'low', impact: 'Roads may be slick.' },
  61: { condition: 'Rain', severity: 'medium', impact: 'Allow extra transit time.' },
  63: { condition: 'Moderate rain', severity: 'medium', impact: 'Allow extra transit time.' },
  65: { condition: 'Heavy rain', severity: 'high', impact: 'Routes may flood or slow.' },
  71: { condition: 'Snow', severity: 'high', impact: 'Winter driving conditions.' },
  80: { condition: 'Rain showers', severity: 'medium', impact: 'Allow extra transit time.' },
  95: { condition: 'Thunderstorm', severity: 'high', impact: 'Hold outdoor loading if lightning is nearby.' },
};

const describeWeather = (code) => {
  if (WMO[code]) return WMO[code];
  if (code <= 3) return WMO[2];
  if (code <= 48) return WMO[45];
  if (code <= 67 || (code >= 80 && code <= 82)) return WMO[61];
  if (code <= 77 || (code >= 85 && code <= 86)) return WMO[71];
  if (code >= 95) return WMO[95];
  return { condition: 'Mixed', severity: 'medium', impact: 'Monitor this location.' };
};

const keyFor = (lat, lng) => `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;

const collectPoints = async () => {
  const byKey = new Map();
  const add = (region, lat, lng) => {
    if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return;
    const key = keyFor(lat, lng);
    if (byKey.has(key)) return;
    byKey.set(key, { region: region || 'Yard', lat: Number(lat), lng: Number(lng) });
  };

  const zones = await WarehouseZone.find({ lat: { $ne: null }, lng: { $ne: null } }).select('name warehouse lat lng');
  zones.forEach((zone) => add(zone.name || zone.warehouse, zone.lat, zone.lng));

  const fences = await Geofence.find({ lat: { $ne: null }, lng: { $ne: null } }).select('name region lat lng');
  fences.forEach((fence) => add(fence.name || fence.region, fence.lat, fence.lng));

  const assets = await FleetAsset.find({
    type: { $in: ['yard', 'port', 'airport', 'rail_yard'] },
  }).select('name fields');
  assets.forEach((asset) => {
    const fields = asset.fields && typeof asset.fields === 'object' ? asset.fields : {};
    add(asset.name || fields.name, fields.lat, fields.lng);
  });

  return Array.from(byKey.values()).slice(0, 8);
};

const fetchForecast = async (point) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
    point.lat
  )}&longitude=${encodeURIComponent(point.lng)}&current=temperature_2m,weather_code,wind_speed_10m,precipitation`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = await res.json();
    const current = data.current || {};
    const mapped = describeWeather(Number(current.weather_code));
    return {
      region: point.region,
      lat: point.lat,
      lng: point.lng,
      condition: mapped.condition,
      severity: mapped.severity,
      impact: mapped.impact,
      temperatureC: current.temperature_2m,
      windKmh: current.wind_speed_10m,
      precipitationMm: current.precipitation,
    };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Live Open-Meteo snapshot for saved yard / geofence coordinates.
 * Returns [] when no real coordinates exist or the weather API is unreachable.
 */
const getWeatherAnalytics = async () => {
  const points = await collectPoints();
  if (!points.length) return [];
  const rows = await Promise.all(
    points.map(async (point) => {
      try {
        return await fetchForecast(point);
      } catch (err) {
        logger.warn(`Open-Meteo failed for ${point.region}: ${err.message}`);
        return null;
      }
    })
  );
  return rows.filter(Boolean);
};

module.exports = {
  getWeatherAnalytics,
};
