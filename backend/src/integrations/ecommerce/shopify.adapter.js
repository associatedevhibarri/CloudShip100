const crypto = require('crypto');
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const config = require('../../config/config');
const { decryptCredentials, safeEqualString } = require('../utils/crypto.util');
const { buildNormalizedOrder, formatAddress, sumWeightKg } = require('./normalize');
const logger = require('../../config/logger');

/**
 * Shopify adapter.
 * Credentials: { shopDomain, accessToken }
 * Live rates: CarrierService callback (dev stores free; production needs CCS / Advanced+)
 * HMAC: X-Shopify-Hmac-Sha256 = base64 HMAC-SHA256(rawBody, webhookSecret|clientSecret)
 */

const verifyWebhook = (storeConnection, req) => {
  const secret = storeConnection.webhookSecret;
  if (!secret) return true;
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  if (!hmacHeader) {
    if (config.env === 'development' || config.env === 'test') {
      logger.warn(`Shopify HMAC missing for connection ${storeConnection.id || storeConnection._id} — allowed in ${config.env}`);
      return true;
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Missing Shopify HMAC');
  }
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const digest = crypto.createHmac('sha256', secret).update(raw).digest('base64');
  if (!safeEqualString(hmacHeader, digest)) {
    if (config.env === 'development' || config.env === 'test') {
      logger.warn(`Shopify HMAC mismatch for connection ${storeConnection.id || storeConnection._id} — allowed in ${config.env}`);
      return true;
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid Shopify HMAC');
  }
  return true;
};

const normalizeOrder = (payload, storeConnection) => {
  const shipping = payload.shipping_address || {};
  const dropoff = formatAddress({
    address1: shipping.address1,
    address2: shipping.address2,
    city: shipping.city,
    province: shipping.province,
    zip: shipping.zip,
    country: shipping.country,
  });
  const creds = safeDecrypt(storeConnection);
  const pickup = creds.pickupAddress || storeConnection.storeUrl || creds.shopDomain || 'Merchant warehouse';

  const weightKg = sumWeightKg(payload.line_items || [], (item) => {
    // Shopify weights often in grams
    if (item.grams != null) return Number(item.grams) / 1000;
    if (item.weight != null) return item.weight;
    return 0.5;
  });

  return buildNormalizedOrder({
    externalOrderId: payload.id || payload.order_number || payload.name,
    pickup,
    dropoff,
    weightKg,
    cargo: (payload.line_items || []).map((i) => i.title || i.name).filter(Boolean).join(', '),
    buyerEmail: payload.email || (payload.customer && payload.customer.email) || null,
    buyerPhone: shipping.phone || payload.phone || null,
    currency: payload.currency || payload.presentment_currency,
    lineItems: payload.line_items,
    raw: payload,
  });
};

/**
 * Shopify CarrierService rate callback body → quote input + response formatter.
 * @see https://shopify.dev/docs/api/admin-rest/latest/resources/carrierservice
 */
const parseRateRequest = (body, storeConnection) => {
  const rate = body.rate || body;
  const origin = rate.origin || {};
  const destination = rate.destination || {};
  const items = rate.items || [];
  const creds = safeDecrypt(storeConnection);
  const pickup =
    formatAddress({
      address1: origin.address1,
      city: origin.city,
      zip: origin.postal_code || origin.zip,
      country: origin.country,
    }) ||
    creds.pickupAddress ||
    'Merchant warehouse';
  const dropoff = formatAddress({
    address1: destination.address1,
    city: destination.city,
    zip: destination.postal_code || destination.zip,
    country: destination.country,
    province: destination.province,
  });
  const weightKg = sumWeightKg(items, (item) => (item.grams != null ? Number(item.grams) / 1000 : item.weight));
  return { pickup, dropoff, weightKg: weightKg > 0 ? weightKg : 1, currency: rate.currency };
};

/** Format CloudShip quote options into Shopify CarrierService rates array */
const formatShopifyRates = (quoteResult) => {
  const rates = (quoteResult.options || []).map((opt) => ({
    service_name:
      opt.partner === 'shop_table'
        ? `CloudShip ${opt.service}`
        : `CloudShip ${opt.partner} ${opt.service}`,
    service_code: `${opt.partner}_${String(opt.service || 'rate').replace(/\s+/g, '_')}`,
    total_price: String(Math.round(Number(opt.quotedPrice) * 100)),
    currency: opt.currency || quoteResult.currency || 'ZAR',
    description:
      opt.etaHours != null
        ? `From ${quoteResult.pickupName || 'your warehouse'} · ETA ~${opt.etaHours}h`
        : `From ${quoteResult.pickupName || 'your warehouse'}`,
  }));
  return { rates };
};

const pushStatus = async (storeConnection, booking, statusPayload) => {
  const creds = safeDecrypt(storeConnection);
  const shop = (creds.shopDomain || storeConnection.storeUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!shop || !creds.accessToken) {
    logger.warn(`Shopify pushStatus skipped — missing credentials for ${storeConnection.id}`);
    return { skipped: true };
  }
  const orderId = booking.externalOrderId;
  if (!orderId) return { skipped: true };
  const headers = {
    'X-Shopify-Access-Token': creds.accessToken,
    'Content-Type': 'application/json',
  };
  const label =
    (statusPayload && (statusPayload.label || statusPayload.courierStatus || statusPayload.status)) ||
    booking.status;
  const note = `CloudShip: ${label} | ${booking.trackingNumber || booking.code || ''}`;

  if (!booking.lastPushedCourierStatus) {
    const res = await fetch(`https://${shop}/admin/api/2024-10/orders/${encodeURIComponent(orderId)}/fulfillments.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fulfillment: {
          tracking_number: booking.trackingNumber || booking.logisticsBookingRef || booking.code,
          tracking_company: 'CloudShip',
          notify_customer: true,
          line_items_by_fulfillment_order: undefined,
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn(`Shopify fulfillment create failed (${res.status}): ${text}`);
    }
  }

  const noteRes = await fetch(`https://${shop}/admin/api/2024-10/orders/${encodeURIComponent(orderId)}.json`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      order: {
        id: orderId,
        note,
      },
    }),
  });
  if (!noteRes.ok) {
    const text = await noteRes.text();
    throw new Error(`Shopify status push failed: ${noteRes.status} ${text}`);
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
  platform: 'shopify',
  verifyWebhook,
  normalizeOrder,
  parseRateRequest,
  formatShopifyRates,
  pushStatus,
};
