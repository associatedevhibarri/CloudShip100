const httpStatus = require('http-status');
const config = require('../../config/config');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');

/**
 * Client for Vasanth's logistics partner layer.
 * Stage 1: stub mode returns deterministic quotes so e-com plugins can ship today.
 * When LOGISTICS_API_URL is set, calls the real internal API.
 *
 * Contract (agree with Vasanth — do not change casually):
 *  POST {base}/quotes  → { options: [{ partner, service, price, currency, etaHours }] }
 *  POST {base}/book    → { bookingRef, trackingNumber, labelUrl? }
 *  GET  {base}/tracking/:ref → { status, trackingNumber, events? }
 */

const stubQuotes = ({ pickup, dropoff, weightKg }) => {
  const base = 45 + Number(weightKg || 1) * 8;
  const distanceFactor = Math.min(String(pickup || '').length + String(dropoff || '').length, 40);
  const courierGuy = Math.round((base + distanceFactor * 0.5) * 100) / 100;
  return {
    options: [
      {
        partner: 'courier_guy',
        service: 'standard',
        price: courierGuy,
        currency: 'ZAR',
        etaHours: 48,
      },
      {
        partner: 'uber_direct',
        service: 'same_day',
        price: Math.round(courierGuy * 1.65 * 100) / 100,
        currency: 'ZAR',
        etaHours: 4,
      },
      {
        partner: 'dhl_express',
        service: 'express',
        price: Math.round(courierGuy * 2.4 * 100) / 100,
        currency: 'ZAR',
        etaHours: 72,
      },
    ],
  };
};

const requestJson = async (method, path, body) => {
  const base = config.ecommerce.logisticsApiUrl;
  if (!base) {
    return null;
  }
  const url = `${base.replace(/\/$/, '')}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(config.ecommerce.logisticsApiKey
      ? { Authorization: `Bearer ${config.ecommerce.logisticsApiKey}` }
      : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error(`Logistics API ${method} ${path} failed: ${res.status} ${text}`);
    throw new ApiError(httpStatus.BAD_GATEWAY, `Logistics partner API error (${res.status})`);
  }
  return res.json();
};

/**
 * @param {{ pickup: string, dropoff: string, weightKg: number, dims?: Object, currency?: string }} params
 */
const getQuotes = async (params) => {
  const live = await requestJson('POST', '/quotes', params);
  if (live && Array.isArray(live.options) && live.options.length) {
    return live;
  }
  if (config.ecommerce.logisticsApiUrl && !live) {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'Logistics quotes unavailable');
  }
  return stubQuotes(params);
};

/**
 * @param {{ quoteSnapshot: Object, pickup: string, dropoff: string, weightKg: number, partner: string, service: string, externalOrderId?: string }} params
 */
const bookShipment = async (params) => {
  const live = await requestJson('POST', '/book', params);
  if (live && live.bookingRef) {
    return live;
  }
  if (config.ecommerce.logisticsApiUrl) {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'Logistics booking failed');
  }
  const ref = `STUB-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  return {
    bookingRef: ref,
    trackingNumber: `TRK-${ref}`,
    labelUrl: null,
    partner: params.partner,
    service: params.service,
    stub: true,
  };
};

const getTracking = async (bookingRef) => {
  const live = await requestJson('GET', `/tracking/${encodeURIComponent(bookingRef)}`);
  if (live) return live;
  return {
    status: 'in_transit',
    trackingNumber: bookingRef,
    events: [],
    stub: true,
  };
};

module.exports = {
  getQuotes,
  bookShipment,
  getTracking,
  stubQuotes,
};
