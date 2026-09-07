const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const { decryptCredentials, safeEqualString, hmacSha256Hex } = require('../utils/crypto.util');
const { buildNormalizedOrder, formatAddress, sumWeightKg } = require('./normalize');
const logger = require('../../config/logger');

/**
 * Wix adapter — eCommerce REST + Shipping Rates service plugin.
 * Credentials: { appId, appSecret, instanceId?, accessToken?, pickupAddress? }
 * Stage 1: verify with shared webhookSecret HMAC header x-wix-signature or x-cloudship-signature
 */

const verifyWebhook = (storeConnection, req) => {
  const secret = storeConnection.webhookSecret;
  if (!secret) return true;
  const signature =
    req.headers['x-wix-signature'] ||
    req.headers['x-cloudship-signature'] ||
    req.headers['x-wix-webhook-signature'];
  if (!signature) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Missing Wix webhook signature');
  }
  const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const expected = hmacSha256Hex(secret, raw);
  if (!safeEqualString(String(signature).toLowerCase(), expected.toLowerCase())) {
    // Some Wix payloads use the raw secret compare of JWT — Stage 1 accepts hex HMAC
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid Wix webhook signature');
  }
  return true;
};

const normalizeOrder = (payload, storeConnection) => {
  const order = payload.order || payload.data || payload;
  const shippingInfo = order.shippingInfo || order.shippingDetails || {};
  const logistics = shippingInfo.logistics || {};
  const shippingAddr =
    logistics.shippingDestination ||
    order.shippingAddress ||
    order.recipientInfo ||
    (order.billingInfo && order.billingInfo.address) ||
    {};

  const dropoff =
    formatAddress({
      address1: shippingAddr.addressLine || shippingAddr.addressLine1 || shippingAddr.street,
      address2: shippingAddr.addressLine2,
      city: shippingAddr.city,
      province: shippingAddr.subdivision || shippingAddr.state,
      postalCode: shippingAddr.postalCode || shippingAddr.zipCode,
      country: shippingAddr.country || shippingAddr.countryFullname,
    }) || String(shippingAddr.formatted || '').trim();

  const creds = safeDecrypt(storeConnection);
  const pickup = creds.pickupAddress || storeConnection.storeUrl || 'Merchant warehouse';

  const lineItems = order.lineItems || order.items || [];
  const weightKg = sumWeightKg(lineItems, (item) => {
    const w = item.physicalProperties && item.physicalProperties.weight;
    return w != null ? w : item.weight || 0.5;
  });

  const buyer =
    order.buyerInfo || order.buyerDetails || (order.billingInfo && order.billingInfo.contactDetails) || {};

  return buildNormalizedOrder({
    externalOrderId: order.id || order.number || order.guid,
    pickup,
    dropoff: dropoff || 'Unknown destination',
    weightKg,
    cargo: lineItems.map((i) => i.productName || i.name || i.title).filter(Boolean).join(', '),
    buyerEmail: buyer.email || null,
    buyerPhone: buyer.phone || null,
    currency: (order.currency || order.priceSummary && order.priceSummary.currency) || 'ZAR',
    lineItems,
    raw: payload,
  });
};

/**
 * Wix Shipping Rates service plugin getShippingRates payload.
 */
const parseRateRequest = (body, storeConnection) => {
  const request = body.request || body;
  const lineItems = request.lineItems || request.items || [];
  const shippingAddress = request.shippingDestination || request.shippingAddress || {};
  const dropoff = formatAddress({
    address1: shippingAddress.addressLine || shippingAddress.addressLine1,
    city: shippingAddress.city,
    postalCode: shippingAddress.postalCode,
    country: shippingAddress.country,
    province: shippingAddress.subdivision,
  });
  const creds = safeDecrypt(storeConnection);
  const pickup = creds.pickupAddress || 'Merchant warehouse';
  const weightKg = sumWeightKg(lineItems, (item) => {
    const w = item.physicalProperties && item.physicalProperties.weight;
    return w != null ? w : 0.5;
  });
  return { pickup, dropoff, weightKg: weightKg > 0 ? weightKg : 1 };
};

/** Format for Wix getShippingRates response */
const formatWixRates = (quoteResult) => ({
  shippingRates: (quoteResult.options || []).map((opt) => ({
    code: `${opt.partner}_${opt.service}`,
    title: `CloudShip ${opt.partner}`,
    logistics: {
      deliveryTime: opt.etaHours != null ? `Up to ${opt.etaHours} hours` : 'Standard',
    },
    cost: {
      price: String(opt.quotedPrice),
      currency: opt.currency || quoteResult.currency || 'ZAR',
    },
  })),
});

const pushStatus = async (storeConnection, booking, statusPayload) => {
  const creds = safeDecrypt(storeConnection);
  if (!creds.accessToken) {
    logger.warn(`Wix pushStatus skipped — no accessToken for ${storeConnection.id}`);
    return { skipped: true };
  }
  // Best-effort: Orders API update (endpoint varies by Wix API version)
  const res = await fetch(`https://www.wixapis.com/ecom/v1/fulfillments/orders/${encodeURIComponent(booking.externalOrderId)}`, {
    method: 'POST',
    headers: {
      Authorization: creds.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fulfillments: [
        {
          lineItems: [],
          trackingInfo: {
            trackingNumber: booking.trackingNumber || booking.logisticsBookingRef,
            shippingProvider: 'CloudShip',
          },
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wix status push failed: ${res.status} ${text}`);
  }
  return { ok: true };
};

const safeDecrypt = (storeConnection) => {
  try {
    return decryptCredentials(storeConnection.credentialsEncrypted);
  } catch (e) {
    return {};
  }
};

module.exports = {
  platform: 'wix',
  verifyWebhook,
  normalizeOrder,
  parseRateRequest,
  formatWixRates,
  pushStatus,
};
