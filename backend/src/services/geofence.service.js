const httpStatus = require('http-status');
const { Geofence } = require('../models');
const ApiError = require('../utils/ApiError');
const seed = require('../seed/geofence.seed.json');

const EARTH_RADIUS_KM = 6371;

const toRadians = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

const withCode = (row) => {
  const { id, ...rest } = row;
  return { code: id, ...rest };
};

let seeded = false;

const ensureSeed = async () => {
  if (seeded) return;
  const count = await Geofence.countDocuments();
  if (count === 0) {
    await Geofence.insertMany(seed.map(withCode));
  }
  seeded = true;
};

/**
 * List all geofence rules
 * @returns {Promise<Geofence[]>}
 */
const listGeofences = async () => {
  await ensureSeed();
  const rows = await Geofence.find().sort('code');
  return rows.map((r) => r.toJSON());
};

/**
 * Create a geofence rule
 * @param {Object} body
 * @returns {Promise<Object>}
 */
const createGeofence = async (body) => {
  await ensureSeed();
  const code = body.id || body.code || `GEO-${Date.now().toString(36).toUpperCase()}`;
  const existing = await Geofence.findOne({ code });
  if (existing) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Geofence id already exists');
  }
  if (body.scope === 'radius' && (body.radiusKm == null || body.lat == null || body.lng == null)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Radius rules require radiusKm, lat, and lng');
  }
  const doc = await Geofence.create({
    code,
    name: body.name,
    scope: body.scope,
    region: body.region,
    radiusKm: body.radiusKm ?? null,
    rule: body.rule,
    exclusions: body.exclusions || [],
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    active: body.active !== false,
  });
  return doc.toJSON();
};

/**
 * Update a geofence rule
 * @param {string} geofenceId
 * @param {Object} body
 * @returns {Promise<Object>}
 */
const updateGeofence = async (geofenceId, body) => {
  await ensureSeed();
  const doc = await Geofence.findOne({ code: geofenceId });
  if (!doc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Geofence not found');
  }
  const fields = ['name', 'scope', 'region', 'radiusKm', 'rule', 'exclusions', 'lat', 'lng', 'active'];
  fields.forEach((key) => {
    if (body[key] !== undefined) {
      doc[key] = body[key];
    }
  });
  if (doc.scope === 'radius' && (doc.radiusKm == null || doc.lat == null || doc.lng == null)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Radius rules require radiusKm, lat, and lng');
  }
  await doc.save();
  return doc.toJSON();
};

/**
 * Delete a geofence rule
 * @param {string} geofenceId
 */
const deleteGeofence = async (geofenceId) => {
  await ensureSeed();
  const result = await Geofence.deleteOne({ code: geofenceId });
  if (!result.deletedCount) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Geofence not found');
  }
};

/**
 * Evaluate a point against active radius rules and collect exclusions
 * @param {{ lat: number, lng: number }} point
 * @returns {Promise<Object>}
 */
const evaluatePoint = async ({ lat, lng }) => {
  await ensureSeed();
  const rules = await Geofence.find({ active: true });
  const matches = [];
  const exclusions = new Set();
  const blocked = [];

  for (const rule of rules) {
    const json = rule.toJSON();
    if (rule.scope === 'radius') {
      if (rule.lat == null || rule.lng == null || rule.radiusKm == null) continue;
      const distanceKm = haversineKm(lat, lng, rule.lat, rule.lng);
      const inside = distanceKm <= rule.radiusKm;
      if (inside) {
        matches.push({
          ...json,
          distanceKm: Math.round(distanceKm * 1000) / 1000,
          inside: true,
        });
        (rule.exclusions || []).forEach((e) => {
          exclusions.add(e);
          blocked.push({ ruleId: json.id, exclusion: e, rule: json.rule });
        });
      }
    } else {
      // Non-radius rules contribute exclusions when the point is near the region center (100 km soft radius)
      if (rule.lat != null && rule.lng != null) {
        const distanceKm = haversineKm(lat, lng, rule.lat, rule.lng);
        if (distanceKm <= 100) {
          matches.push({
            ...json,
            distanceKm: Math.round(distanceKm * 1000) / 1000,
            inside: true,
          });
          (rule.exclusions || []).forEach((e) => {
            exclusions.add(e);
            blocked.push({ ruleId: json.id, exclusion: e, rule: json.rule });
          });
        }
      }
    }
  }

  return {
    lat,
    lng,
    matchedRules: matches,
    exclusions: [...exclusions],
    exceptions: blocked,
    allowed: blocked.length === 0,
  };
};

module.exports = {
  listGeofences,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  evaluatePoint,
};
