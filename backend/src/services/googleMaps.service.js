/* global fetch */
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

/**
 * Get a route between two addresses (optionally via waypoints) using the Google Directions API.
 * @param {Object} params
 * @param {string} params.origin
 * @param {string} params.destination
 * @param {string[]} [params.waypoints] - intermediate stop addresses, optimized for shortest route
 * @returns {Promise<{distanceKm: number, durationMinutes: number, waypointOrder: number[], formattedOrigin: string, formattedDestination: string}>}
 */
const getRoute = async ({ origin, destination, waypoints = [] }) => {
  if (!config.googleMaps.apiKey) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Maps service not configured');
  }

  const params = new URLSearchParams({
    origin,
    destination,
    key: config.googleMaps.apiKey,
  });
  if (waypoints.length) {
    params.set('waypoints', `optimize:true|${waypoints.join('|')}`);
  }

  const response = await fetch(`${DIRECTIONS_URL}?${params.toString()}`);
  const data = await response.json();

  if (data.status !== 'OK' || !data.routes || !data.routes.length) {
    throw new ApiError(httpStatus.BAD_GATEWAY, `Maps API error: ${data.status || 'unknown'}`);
  }

  const route = data.routes[0];
  const legs = route.legs || [];
  const distanceMeters = legs.reduce((sum, leg) => sum + leg.distance.value, 0);
  const durationSeconds = legs.reduce((sum, leg) => sum + leg.duration.value, 0);

  return {
    distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
    durationMinutes: Math.round(durationSeconds / 60),
    waypointOrder: route.waypoint_order || [],
    formattedOrigin: legs[0] ? legs[0].start_address : origin,
    formattedDestination: legs.length ? legs[legs.length - 1].end_address : destination,
  };
};

module.exports = {
  getRoute,
};
