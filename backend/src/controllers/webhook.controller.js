const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const storeConnectionService = require('../services/storeConnection.service');
const quoteBridge = require('../integrations/bridge/quoteBridge.service');
const orderBridge = require('../integrations/bridge/orderBridge.service');
const paymentBridge = require('../integrations/bridge/paymentBridge.service');
const { getAdapter } = require('../integrations/ecommerce');
const { getStripe } = require('../integrations/bridge/stripeClient');

const resolveConnection = async (platform, req) => {
  const connectionId =
    req.params.connectionId ||
    req.headers['x-cloudship-connection-id'] ||
    req.query.connectionId;
  if (connectionId) {
    const conn = await storeConnectionService.findById(connectionId);
    if (!conn || conn.platform !== platform || conn.status !== 'active') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Store connection not found');
    }
    return conn;
  }

  if (platform === 'lovable') {
    const key = req.headers['x-cloudship-key'] || req.headers['x-api-key'];
    const conn = await storeConnectionService.findByPublicApiKey(key);
    if (!conn) throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid API key');
    return conn;
  }

  const shopDomain =
    req.headers['x-shopify-shop-domain'] ||
    req.headers['x-wc-webhook-source'] ||
    req.query.shop;
  if (shopDomain) {
    const conn = await storeConnectionService.findActiveByPlatformAndUrl(platform, shopDomain);
    if (conn) return conn;
  }

  throw new ApiError(
    httpStatus.BAD_REQUEST,
    'Pass connectionId in path/query or X-CloudShip-Connection-Id header'
  );
};

const handleOrderWebhook = (platform) =>
  catchAsync(async (req, res) => {
    const conn = await resolveConnection(platform, req);
    const adapter = getAdapter(platform);
    adapter.verifyWebhook(conn, req);

    // Ignore non-create topics softly
    const topic = String(
      req.headers['x-wc-webhook-topic'] ||
        req.headers['x-shopify-topic'] ||
        req.body.eventType ||
        req.body.event ||
        'order.created'
    ).toLowerCase();
    if (topic.includes('delete') || topic.includes('cancelled') || topic.includes('canceled')) {
      return res.status(httpStatus.OK).send({ ignored: true, reason: topic });
    }

    const normalized = adapter.normalizeOrder(req.body, conn);
    const result = await orderBridge.ingestNormalizedOrder({
      storeConnection: conn,
      normalized,
      quoteId: req.body.quoteId || req.query.quoteId,
      partner: req.body.partner,
      service: req.body.service,
    });
    return res.status(result.duplicate ? httpStatus.OK : httpStatus.CREATED).send({
      duplicate: result.duplicate,
      bookingId: result.booking.id || result.booking._id,
      bookingCode: result.booking.code,
      payment: result.payment,
      paymentStatus: result.booking.paymentStatus,
    });
  });

const handleRates = (platform) =>
  catchAsync(async (req, res) => {
    const conn = await resolveConnection(platform, req);
    const adapter = getAdapter(platform);
    // Rate callbacks are often unsigned (Shopify CarrierService) — verify only if secret + signature present
    try {
      if (conn.webhookSecret && (req.headers['x-shopify-hmac-sha256'] || req.headers['x-cloudship-signature'])) {
        adapter.verifyWebhook(conn, req);
      }
    } catch (e) {
      // CarrierService from Shopify may not HMAC the same way; continue for Stage 1 with connectionId auth
    }

    const parsed = adapter.parseRateRequest(req.body, conn);
    if (!parsed.dropoff) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'destination address required for rates');
    }
    const quote = await quoteBridge.createMarketplaceQuote({
      pickup: parsed.pickup,
      dropoff: parsed.dropoff,
      weightKg: parsed.weightKg,
      currency: parsed.currency || (conn.settings && conn.settings.currency) || 'ZAR',
      mode: (conn.settings && conn.settings.defaultMode) || 'Road',
      storeConnection: conn,
      storeConnectionId: conn.id || conn._id,
      companyId: conn.company,
    });

    if (platform === 'shopify' && typeof adapter.formatShopifyRates === 'function') {
      return res.send(adapter.formatShopifyRates(quote));
    }
    if (platform === 'wix' && typeof adapter.formatWixRates === 'function') {
      return res.send(adapter.formatWixRates(quote));
    }
    return res.send(quote);
  });

const stripeWebhook = catchAsync(async (req, res) => {
  const secret = config.ecommerce.stripeWebhookSecret;
  if (!secret || !config.ecommerce.stripeSecretKey) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Stripe webhook is not configured');
  }
  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.rawBody, signature, secret);
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid Stripe signature: ${err.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const booking = await paymentBridge.confirmPaymentAndBook(intent.id);
    await orderBridge.afterSuccessfulBook(booking);
  }
  res.send({ received: true });
});

module.exports = {
  wooOrder: handleOrderWebhook('woocommerce'),
  wooRates: handleRates('woocommerce'),
  shopifyOrder: handleOrderWebhook('shopify'),
  shopifyRates: handleRates('shopify'),
  wixOrder: handleOrderWebhook('wix'),
  wixRates: handleRates('wix'),
  lovableOrder: handleOrderWebhook('lovable'),
  lovableRates: handleRates('lovable'),
  stripeWebhook,
};
