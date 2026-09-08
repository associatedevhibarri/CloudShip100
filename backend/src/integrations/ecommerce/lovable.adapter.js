const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const { safeEqualString, hmacSha256Hex } = require('../utils/crypto.util');
const { buildNormalizedOrder, formatAddress } = require('./normalize');

/**
 * Lovable / universal SDK adapter.
 * Auth: publicApiKey on StoreConnection + HMAC header x-cloudship-signature = hex(HMAC-SHA256(rawBody, webhookSecret))
 * Body for rates/orders is already close to CloudShip shape.
 */

const verifyWebhook = (storeConnection, req) => {
  const apiKey = req.headers['x-cloudship-key'] || req.headers['x-api-key'];
  if (storeConnection.publicApiKey && apiKey && apiKey !== storeConnection.publicApiKey) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid CloudShip API key');
  }
  const secret = storeConnection.webhookSecret;
  if (!secret) return true;
  const signature = req.headers['x-cloudship-signature'];
  if (!signature) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Missing CloudShip signature');
  }
  const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const expected = hmacSha256Hex(secret, raw);
  if (!safeEqualString(String(signature).toLowerCase(), expected.toLowerCase())) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid CloudShip signature');
  }
  return true;
};

const normalizeOrder = (payload) => {
  const dropoff =
    payload.dropoff ||
    formatAddress(payload.shippingAddress || payload.destination || {}) ||
    payload.to;
  const pickup = payload.pickup || formatAddress(payload.origin || {}) || 'Merchant warehouse';
  return buildNormalizedOrder({
    externalOrderId: payload.externalOrderId || payload.orderId || payload.id,
    pickup,
    dropoff,
    weightKg: payload.weightKg || payload.weight,
    cargo: payload.cargo || payload.description,
    buyerEmail: payload.buyerEmail || (payload.buyer && payload.buyer.email),
    buyerPhone: payload.buyerPhone || (payload.buyer && payload.buyer.phone),
    currency: payload.currency,
    lineItems: payload.lineItems || payload.items,
    raw: payload,
  });
};

const parseRateRequest = (body) => {
  const dropoff =
    body.dropoff || formatAddress(body.shippingAddress || body.destination || {}) || body.to;
  const pickup = body.pickup || formatAddress(body.origin || {}) || 'Merchant warehouse';
  const weightKg = Number(body.weightKg || body.weight || 1);
  return {
    pickup,
    dropoff,
    weightKg: weightKg > 0 ? weightKg : 1,
    currency: body.currency,
  };
};

/** Universal SDK does not need push — caller polls /track; optional callback URL later */
const pushStatus = async (storeConnection, booking, statusPayload) => {
  const creds = (() => {
    try {
      const { decryptCredentials } = require('../utils/crypto.util');
      return decryptCredentials(storeConnection.credentialsEncrypted);
    } catch (e) {
      return {};
    }
  })();
  if (!creds.statusWebhookUrl) {
    return { skipped: true };
  }
  const res = await fetch(creds.statusWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalOrderId: booking.externalOrderId,
      bookingCode: booking.code,
      status: statusPayload.status || booking.status,
      trackingNumber: booking.trackingNumber,
      logisticsBookingRef: booking.logisticsBookingRef,
    }),
  });
  if (!res.ok) {
    throw new Error(`Lovable status webhook failed: ${res.status}`);
  }
  return { ok: true };
};

module.exports = {
  platform: 'lovable',
  verifyWebhook,
  normalizeOrder,
  parseRateRequest,
  pushStatus,
};
