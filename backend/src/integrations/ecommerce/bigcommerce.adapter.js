const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const config = require('../../config/config');
const { decryptCredentials, safeEqualString, hmacSha256Hex } = require('../utils/crypto.util');
const { buildNormalizedOrder, formatAddress, sumWeightKg } = require('./normalize');
const logger = require('../../config/logger');

/**
 * BigCommerce adapter.
 * Credentials: { storeHash, accessToken, clientSecret?, pickupAddress? }
 * Orders: store/order/created webhook (full v2 order body or { data: { id } }).
 * Rates: Shipping Provider POST /rate callback.
 * HMAC: X-Signature = hex HMAC-SHA256(rawBody, clientSecret|webhookSecret)
 */

const itemWeightKg = (item) => {
  const raw = item && (item.weight != null ? item.weight : item.weight_kg);
  if (raw && typeof raw === 'object') {
    const value = Number(raw.value != null ? raw.value : raw.weight);
    const units = String(raw.units || raw.unit || 'kg').toLowerCase();
    if (!Number.isFinite(value)) return 0.5;
    if (units.startsWith('oz')) return value * 0.0283495;
    if (units.startsWith('lb') || units === 'pound') return value * 0.453592;
    if (units.startsWith('g') && !units.startsWith('kg')) return value / 1000;
    return value;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0.5;
};

const verifyWebhook = (storeConnection, req) => {
  const creds = safeDecrypt(storeConnection);
  const secret = creds.clientSecret || creds.webhookSecret || storeConnection.webhookSecret;
  const hmacHeader = req.headers['x-signature'] || req.headers['x-bc-webhook-signature'];
  if (!secret) {
    if (config.env === 'production') {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'BigCommerce webhook secret is not configured');
    }
    return true;
  }
  if (!hmacHeader) {
    if (config.env === 'development' || config.env === 'test') {
      logger.warn(
        `BigCommerce HMAC missing for connection ${storeConnection.id || storeConnection._id} — allowed in ${config.env}`
      );
      return true;
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Missing BigCommerce HMAC');
  }
  const raw = req.rawBody
    ? req.rawBody.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);
  const digest = hmacSha256Hex(secret, raw);
  if (!safeEqualString(String(hmacHeader).toLowerCase(), String(digest).toLowerCase())) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid BigCommerce HMAC');
  }
  return true;
};

const orderFromPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return {};
  if (payload.billing_address || payload.shipping_addresses || payload.products) return payload;
  if (payload.data && (payload.data.billing_address || payload.data.shipping_addresses || payload.data.products)) {
    return payload.data;
  }
  return payload.order || payload.data || payload;
};

const isFullOrder = (order) =>
  Boolean(
    order &&
      (order.billing_address ||
        (Array.isArray(order.shipping_addresses) && order.shipping_addresses.length) ||
        (Array.isArray(order.products) && order.products.length) ||
        (Array.isArray(order.line_items) && order.line_items.length))
  );

const fetchBcJson = async (storeHash, accessToken, path) => {
  const res = await fetch(`https://api.bigcommerce.com/stores/${encodeURIComponent(storeHash)}${path}`, {
    headers: { 'X-Auth-Token': accessToken, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BigCommerce API ${res.status} ${path}: ${text}`);
  }
  return res.json();
};

const hydrateOrder = async (order, storeConnection) => {
  if (isFullOrder(order)) return order;
  const creds = safeDecrypt(storeConnection);
  const hash = creds.storeHash || String(storeConnection.storeUrl || '').replace(/^https?:\/\//, '').split('.')[0];
  const token = creds.accessToken;
  const id = order && (order.id || order.order_id);
  if (!hash || !token || !id) return order;
  const full = await fetchBcJson(hash, token, `/v2/orders/${encodeURIComponent(id)}`);
  let products = Array.isArray(full.products) ? full.products : [];
  if (!products.length) {
    try {
      products = await fetchBcJson(hash, token, `/v2/orders/${encodeURIComponent(id)}/products`);
    } catch (e) {
      logger.warn(`BigCommerce products fetch skipped for order ${id}: ${e.message}`);
    }
  }
  let shipping_addresses = Array.isArray(full.shipping_addresses) ? full.shipping_addresses : [];
  if (!shipping_addresses.length) {
    try {
      shipping_addresses = await fetchBcJson(hash, token, `/v2/orders/${encodeURIComponent(id)}/shipping_addresses`);
    } catch (e) {
      logger.warn(`BigCommerce shipping fetch skipped for order ${id}: ${e.message}`);
    }
  }
  return { ...full, products, shipping_addresses };
};

const normalizeOrder = async (payload, storeConnection) => {
  const stub = orderFromPayload(payload);
  const order = await hydrateOrder(stub, storeConnection);
  const extId = (order && (order.id || order.order_id)) || (payload && payload.data && payload.data.id) || (payload && payload.externalOrderId);
  if (!extId) {
    return { externalOrderId: null };
  }

  const shipping =
    (Array.isArray(order.shipping_addresses) && order.shipping_addresses[0]) ||
    order.shipping_address ||
    order.billing_address ||
    {};
  const dropoff =
    formatAddress({
      address1: shipping.street_1 || shipping.address1,
      address2: shipping.street_2 || shipping.address2,
      city: shipping.city,
      province: shipping.state || shipping.province,
      zip: shipping.zip || shipping.postal_code,
      country: shipping.country_iso2 || shipping.country,
    }) || String(shipping.street_1 || '').trim();

  const creds = safeDecrypt(storeConnection);
  const pickup =
    creds.pickupAddress ||
    (storeConnection.settings && storeConnection.settings.pickupAddress) ||
    creds.storeHash ||
    storeConnection.storeUrl ||
    'Merchant warehouse';

  const products = Array.isArray(order.products)
    ? order.products
    : order.line_items || order.items || [];
  const weightKg = sumWeightKg(products, itemWeightKg);

  return buildNormalizedOrder({
    externalOrderId: String(extId),
    pickup,
    dropoff: dropoff || 'Unknown destination',
    weightKg,
    cargo: products.map((p) => p.name || p.sku || p.title).filter(Boolean).join(', '),
    buyerEmail: (order.billing_address && order.billing_address.email) || shipping.email || null,
    buyerPhone: (order.billing_address && order.billing_address.phone) || shipping.phone || null,
    currency: order.currency_code || order.currency || 'ZAR',
    lineItems: products,
    raw: {
      ...((payload && typeof payload === 'object') ? payload : {}),
      ...order,
      total: order.total_inc_tax || order.total,
      subtotal: order.subtotal_inc_tax || order.subtotal_ex_tax || order.subtotal,
      shipping_total: order.shipping_cost_inc_tax || order.shipping_cost_ex_tax || order.shipping_cost,
    },
  });
};

const parseRateRequest = (body, storeConnection) => {
  const base = (body && (body.base_options || body.rate || body.request)) || body || {};
  const origin = base.origin || {};
  const destination = base.destination || {};
  const items = base.items || [];
  const creds = safeDecrypt(storeConnection);
  const pickup =
    formatAddress({
      address1: origin.street_1 || origin.address1 || origin.street1,
      city: origin.city,
      zip: origin.zip || origin.postal_code,
      country: origin.country_iso2 || origin.country,
    }) ||
    creds.pickupAddress ||
    (storeConnection.settings && storeConnection.settings.pickupAddress) ||
    'Merchant warehouse';
  const dropoff = formatAddress({
    address1: destination.street_1 || destination.address1 || destination.street1,
    city: destination.city,
    zip: destination.zip || destination.postal_code,
    country: destination.country_iso2 || destination.country,
    province: destination.state || destination.province,
  });
  const weightKg = sumWeightKg(items, itemWeightKg);
  return {
    pickup,
    dropoff,
    weightKg: weightKg > 0 ? weightKg : 1,
    currency: (base.customer && base.customer.currency) || (body && body.currency) || 'ZAR',
  };
};

const formatBigCommerceRates = (quoteResult) => {
  const quotes = (quoteResult.options || []).map((opt, index) => ({
    quote_id: `${quoteResult.quoteId || 'cs'}_${index}`,
    code: `${opt.partner}_${String(opt.service || 'rate').replace(/\s+/g, '_')}`,
    display_name:
      opt.partner === 'shop_table' ? `CloudShip ${opt.service}` : `CloudShip ${opt.partner} ${opt.service}`,
    cost: {
      currency: opt.currency || quoteResult.currency || 'ZAR',
      amount: Number(opt.quotedPrice),
    },
    transit_time: {
      units: 'hours',
      duration: opt.etaHours != null ? Number(opt.etaHours) : 24,
    },
    messages: opt.etaHours != null ? [`ETA ~${opt.etaHours}h`] : [],
  }));
  return {
    quote_id: quoteResult.quoteId || `cs_${Date.now()}`,
    messages: [],
    carrier_quotes: [
      {
        carrier_info: { code: 'cloudship', display_name: 'CloudShip' },
        quotes,
      },
    ],
  };
};

const pushStatus = async (storeConnection, booking, statusPayload) => {
  const creds = safeDecrypt(storeConnection);
  const hash = creds.storeHash || String(storeConnection.storeUrl || '').replace(/^https?:\/\//, '').split('.')[0];
  if (!hash || !creds.accessToken) {
    logger.warn(`BigCommerce pushStatus skipped — missing credentials for ${storeConnection.id}`);
    return { skipped: true };
  }
  const orderId = booking.externalOrderId;
  if (!orderId) return { skipped: true };
  const label =
    (statusPayload && (statusPayload.label || statusPayload.courierStatus || statusPayload.status)) ||
    booking.status;
  const res = await fetch(`https://api.bigcommerce.com/stores/${encodeURIComponent(hash)}/v2/orders/${encodeURIComponent(orderId)}/shipments`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': creds.accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      tracking_number: booking.trackingNumber || booking.logisticsBookingRef || booking.code,
      comments: `CloudShip: ${label}`,
      shipping_provider: 'CloudShip',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BigCommerce status push failed: ${res.status} ${text}`);
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
  platform: 'bigcommerce',
  verifyWebhook,
  normalizeOrder,
  parseRateRequest,
  formatBigCommerceRates,
  pushStatus,
};
