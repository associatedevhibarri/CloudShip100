/* global fetch */
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

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

const componentOf = (components, type, useShort = false) => {
  const row = (components || []).find((item) => Array.isArray(item.types) && item.types.includes(type));
  if (!row) return '';
  return String((useShort ? row.short_name : row.long_name) || '').trim();
};

const mapPlaceToAddress = (place = {}) => {
  const components = place.address_components || [];
  const streetNumber = componentOf(components, 'street_number');
  const route = componentOf(components, 'route');
  const street = [streetNumber, route].filter(Boolean).join(' ').trim();
  const city =
    componentOf(components, 'locality') ||
    componentOf(components, 'postal_town') ||
    componentOf(components, 'sublocality_level_1') ||
    componentOf(components, 'administrative_area_level_2');
  const state = componentOf(components, 'administrative_area_level_1', true);
  const postalCode = componentOf(components, 'postal_code');
  const country = componentOf(components, 'country', true).toUpperCase();
  return {
    formatted: place.formatted_address || [street, city, state, postalCode, country].filter(Boolean).join(', '),
    street,
    city,
    state,
    postalCode,
    country,
  };
};

const googleGet = async (url, params) => {
  const search = new URLSearchParams({ ...params, key: config.googleMaps.apiKey });
  const response = await fetch(`${url}?${search.toString()}`);
  return response.json();
};

const autocompletePlaces = async ({ input, sessionToken, country } = {}) => {
  if (!config.googleMaps.apiKey) {
    return { configured: false, suggestions: [] };
  }
  const query = String(input || '').trim();
  if (query.length < 3) {
    return { configured: true, suggestions: [] };
  }

  const params = {
    input: query,
    types: 'address',
    language: 'en',
  };
  if (sessionToken) params.sessiontoken = sessionToken;
  const countries = String(country || '')
    .split(',')
    .map((code) => code.trim().toLowerCase())
    .filter((code) => /^[a-z]{2}$/.test(code));
  if (countries.length) {
    params.components = countries.map((code) => `country:${code}`).join('|');
  }

  const data = await googleGet(AUTOCOMPLETE_URL, params);
  if (data.status === 'ZERO_RESULTS' || data.status === 'OK') {
    return {
      configured: true,
      suggestions: (data.predictions || []).map((row) => ({
        placeId: row.place_id,
        description: row.description,
        mainText: (row.structured_formatting && row.structured_formatting.main_text) || row.description,
        secondaryText: (row.structured_formatting && row.structured_formatting.secondary_text) || '',
      })),
    };
  }
  logger.warn(`Places autocomplete failed: ${data.status} ${data.error_message || ''}`.trim());
  return { configured: data.status !== 'REQUEST_DENIED', suggestions: [] };
};

const getPlaceDetails = async ({ placeId, sessionToken } = {}) => {
  if (!config.googleMaps.apiKey) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Maps service not configured');
  }
  if (!placeId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'placeId is required');
  }

  const params = {
    place_id: placeId,
    fields: 'formatted_address,address_component',
    language: 'en',
  };
  if (sessionToken) params.sessiontoken = sessionToken;

  const data = await googleGet(DETAILS_URL, params);
  if (data.status !== 'OK' || !data.result) {
    throw new ApiError(httpStatus.BAD_GATEWAY, `Maps API error: ${data.status || 'unknown'}`);
  }
  return mapPlaceToAddress(data.result);
};

module.exports = {
  getRoute,
  autocompletePlaces,
  getPlaceDetails,
  mapPlaceToAddress,
};
