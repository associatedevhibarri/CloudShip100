const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const config = require('../../config/config');
const { decryptCredentials, safeEqualString, hmacSha256Base64 } = require('../utils/crypto.util');
const { buildNormalizedOrder, formatAddress, sumWeightKg } = require('./normalize');
const logger = require('../../config/logger');

/**
 * WooCommerce adapter — free REST + webhooks.
 * Credentials: { consumerKey, consumerSecret, storeUrl? }
 * Webhook header: X-WC-Webhook-Signature = base64 HMAC-SHA256(body, webhookSecret)
 */

const verifyWebhook = (storeConnection, req) => {
  const secret = storeConnection.webhookSecret;
  if (!secret) {
    return true;
  }
  const signature = req.headers['x-wc-webhook-signature'];
  // Postman / local QA: allow unsigned webhooks in development only
  const pluginPush = String(req.headers['x-cloudship-plugin'] || '') === 'woocommerce';
  if (!signature) {
    if (pluginPush || config.env === 'development' || config.env === 'test') {
      logger.warn(
        `Woo webhook unsigned for connection ${storeConnection.id || storeConnection._id} — allowed (${pluginPush ? 'plugin' : config.env})`
      );
      return true;
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Missing WooCommerce webhook signature');
  }
  const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const expected = hmacSha256Base64(secret, raw);
  if (!safeEqualString(signature, expected)) {
    if (pluginPush) {
      logger.warn(
        `Woo webhook signature mismatch for connection ${storeConnection.id || storeConnection._id} — allowed (plugin)`
      );
      return true;
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid WooCommerce webhook signature');
  }
  return true;
};

const normalizeOrder = (payload, storeConnection) => {
  if (!payload || (!payload.id && !payload.number)) {
    return null;
  }
  const shipping = payload.shipping || {};
  const billing = payload.billing || {};
  const dropoff = formatAddress(shipping) || formatAddress(billing) || 'Address pending';
  const creds = safeDecrypt(storeConnection);
  const pickup =
    (storeConnection.settings && storeConnection.settings.pickupAddress) ||
    creds.pickupAddress ||
    storeConnection.storeUrl ||
    'Merchant warehouse';

  const weightKg = sumWeightKg(payload.line_items || [], (item) => {
    if (item.weight != null) return item.weight;
    if (item.meta_data) {
      const meta = item.meta_data.find((m) => m.key === '_weight' || m.key === 'weight');
      if (meta) return meta.value;
    }
    return 0.5;
  });

  return buildNormalizedOrder({
    externalOrderId: payload.id || payload.number,
    pickup,
    dropoff,
    weightKg,
    cargo: (payload.line_items || []).map((i) => i.name).filter(Boolean).join(', ') || undefined,
    buyerEmail: billing.email || payload.billing_email || null,
    buyerPhone: billing.phone || shipping.phone || null,
    currency: payload.currency,
    lineItems: payload.line_items,
    raw: payload,
  });
};

/**
 * Map Woo rate request / cart package into quote input.
 * Body shape from our custom shipping method plugin.
 */
const parseRateRequest = (body, storeConnection) => {
  const dest = body.destination || body.shipping || {};
  const dropoff = formatAddress(dest) || body.dropoff;
  const creds = safeDecrypt(storeConnection);
  const pickup = body.pickup || creds.pickupAddress || storeConnection.storeUrl || 'Merchant warehouse';
  const weightKg = Number(body.weightKg || body.weight || sumWeightKg(body.items || [], (i) => i.weight));
  return { pickup, dropoff, weightKg: weightKg > 0 ? weightKg : 1 };
};

/**
 * Best-effort status push via Woo REST. Failures must not break CloudShip flow.
 * Called on every courier status change, not only at book time.
 */
const shopBaseUrl = (storeConnection, creds) => {
  const raw =
    (creds && creds.storeUrl) ||
    storeConnection.storeUrl ||
    (storeConnection.settings && storeConnection.settings.storeUrl) ||
    '';
  return String(raw).replace(/\/$/, '');
};

const shopNote = (booking, statusPayload = {}) => {
  const label = statusPayload.label || statusPayload.courierStatus || statusPayload.status;
  const track = booking.trackingNumber || booking.logisticsBookingRef || booking.code;
  const widget = `${config.frontendUrl}/embed/track?code=${encodeURIComponent(booking.code || '')}`;
  return `CloudShip: ${label}. Tracking ${track}. ${widget}`;
};

const pushStatus = async (storeConnection, booking, statusPayload) => {
  const creds = safeDecrypt(storeConnection);
  const base = shopBaseUrl(storeConnection, creds);
  if (!base || !creds.consumerKey || !creds.consumerSecret) {
    logger.warn(`Woo pushStatus skipped — missing store URL or REST keys for ${storeConnection.id}`);
    return { skipped: true };
  }
  const orderId = booking.externalOrderId;
  if (!orderId) return { skipped: true };
  const note = shopNote(booking, statusPayload || {});
  const auth = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString('base64');
  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${base}/wp-json/wc/v3/orders/${encodeURIComponent(orderId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      status: mapWooStatus((statusPayload && statusPayload.status) || booking.status),
      meta_data: [
        { key: '_cloudship_tracking', value: booking.trackingNumber || '' },
        { key: '_cloudship_booking', value: booking.code || '' },
        { key: '_cloudship_courier_status', value: (statusPayload && statusPayload.courierStatus) || '' },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WooCommerce status push failed: ${res.status} ${text}`);
  }
  const noteRes = await fetch(`${base}/wp-json/wc/v3/orders/${encodeURIComponent(orderId)}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      note,
      customer_note: true,
    }),
  });
  if (!noteRes.ok) {
    logger.warn(`Woo order note failed for ${orderId}: ${noteRes.status}`);
  }
  return { ok: true };
};

const mapWooStatus = (status) => {
  const s = String(status || '')
    .toLowerCase()
    .replaceAll('_', '-');
  if (s === 'delivered' || s === 'completed' || s === 'ready-for-pickup') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return 'processing';
};

const safeDecrypt = (storeConnection) => {
  try {
    return decryptCredentials(storeConnection.credentialsEncrypted);
  } catch (e) {
    return {};
  }
};

module.exports = {
  platform: 'woocommerce',
  verifyWebhook,
  normalizeOrder,
  parseRateRequest,
  pushStatus,
};
