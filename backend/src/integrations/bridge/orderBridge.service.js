const httpStatus = require('http-status');
const { Booking, IntegrationEvent } = require('../../models');
const ApiError = require('../../utils/ApiError');
const quoteBridge = require('./quoteBridge.service');
const paymentBridge = require('./paymentBridge.service');
const { getAdapter } = require('../ecommerce');

const TIMELINE_TEMPLATE = [
  { stage: 'booked', label: 'Booked' },
  { stage: 'warehouse', label: 'Warehouse' },
  { stage: 'in_transit', label: 'In Transit' },
  { stage: 'out_for_delivery', label: 'Out for Delivery' },
  { stage: 'delivered', label: 'Delivered' },
];

const generateBookingCode = async () => {
  const count = await Booking.countDocuments();
  return `BKG-MKT-${String(count + 1).padStart(5, '0')}`;
};

/**
 * Idempotent event claim. Returns { event, isDuplicate }.
 */
const claimEvent = async ({ platform, eventType, externalEventId, storeConnectionId, payload }) => {
  try {
    const event = await IntegrationEvent.create({
      platform,
      eventType,
      externalEventId: String(externalEventId),
      storeConnection: storeConnectionId || null,
      status: 'processing',
      attempts: 1,
      payload: payload || {},
    });
    return { event, isDuplicate: false };
  } catch (err) {
    if (err && err.code === 11000) {
      const existing = await IntegrationEvent.findOne({ platform, externalEventId: String(externalEventId) });
      return { event: existing, isDuplicate: true };
    }
    throw err;
  }
};

/**
 * Create marketplace booking from a normalized order + optional quoteId.
 * Does NOT book courier until payment is confirmed.
 *
 * @param {Object} params
 * @param {Object} params.storeConnection
 * @param {Object} params.normalized — from adapters
 * @param {string} [params.quoteId]
 * @param {string} [params.partner]
 * @param {string} [params.service]
 */
const ingestNormalizedOrder = async ({ storeConnection, normalized, quoteId, partner, service }) => {
  if (!storeConnection || storeConnection.status !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Store connection inactive');
  }
  if (!normalized || !normalized.externalOrderId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'externalOrderId required');
  }

  const platform = storeConnection.platform;
  const { event, isDuplicate } = await claimEvent({
    platform,
    eventType: 'order.created',
    externalEventId: `${platform}:order:${normalized.externalOrderId}`,
    storeConnectionId: storeConnection.id || storeConnection._id,
    payload: normalized,
  });

  if (isDuplicate) {
    if (event.booking) {
      const existing = await Booking.findById(event.booking);
      if (existing) return { booking: existing, duplicate: true, payment: null };
    }
    const existingByExt = await Booking.findOne({
      storeConnection: storeConnection.id || storeConnection._id,
      externalOrderId: String(normalized.externalOrderId),
      source: platform,
    });
    if (existingByExt) return { booking: existingByExt, duplicate: true, payment: null };
  }

  let money;
  let quoteMeta = {};
  if (quoteId) {
    const q = await quoteBridge.getValidQuote(quoteId, { partner, service });
    money = {
      carrierCost: q.carrierCost,
      marginAmount: q.marginAmount,
      marginPercent: q.marginPercent,
      quotedPrice: q.quotedPrice,
      partner: q.partner,
      service: q.service,
    };
    quoteMeta = { quoteId, pickup: q.doc.pickup, dropoff: q.doc.dropoff, weightKg: q.doc.weightKg, mode: q.doc.mode };
  } else {
    const fresh = await quoteBridge.createMarketplaceQuote({
      pickup: normalized.pickup,
      dropoff: normalized.dropoff,
      weightKg: normalized.weightKg || 1,
      mode: (storeConnection.settings && storeConnection.settings.defaultMode) || 'Road',
      currency: (storeConnection.settings && storeConnection.settings.currency) || 'ZAR',
      storeConnectionId: storeConnection.id || storeConnection._id,
      companyId: storeConnection.company,
      preferredPartner: partner,
    });
    money = {
      carrierCost: fresh.selected.carrierCost,
      marginAmount: fresh.selected.marginAmount,
      marginPercent: fresh.selected.marginPercent,
      quotedPrice: fresh.selected.quotedPrice,
      partner: fresh.selected.partner,
      service: fresh.selected.service,
    };
    quoteMeta = {
      quoteId: fresh.quoteId,
      pickup: fresh.pickup,
      dropoff: fresh.dropoff,
      weightKg: fresh.weightKg,
      mode: fresh.mode,
    };
  }

  const now = new Date();
  const timeline = TIMELINE_TEMPLATE.map((step, i) => ({
    ...step,
    timestamp: i === 0 ? now : null,
    done: i === 0,
  }));

  const code = await generateBookingCode();
  let booking;
  try {
    booking = await Booking.create({
      company: storeConnection.company,
      code,
      status: 'pending',
      mode: quoteMeta.mode || 'Road',
      cargo: normalized.cargo || `Order ${normalized.externalOrderId}`,
      value: money.quotedPrice,
      pickup: quoteMeta.pickup || normalized.pickup,
      dropoff: quoteMeta.dropoff || normalized.dropoff,
      timeline,
      bookedAt: now,
      source: platform,
      storeConnection: storeConnection.id || storeConnection._id,
      externalOrderId: String(normalized.externalOrderId),
      quoteId: quoteMeta.quoteId || null,
      carrierCost: money.carrierCost,
      marginAmount: money.marginAmount,
      marginPercent: money.marginPercent,
      quotedPrice: money.quotedPrice,
      currency: (storeConnection.settings && storeConnection.settings.currency) || 'ZAR',
      paymentStatus: 'awaiting',
      selectedPartner: money.partner,
      selectedService: money.service,
      weightKg: quoteMeta.weightKg || normalized.weightKg || null,
      buyerEmail: normalized.buyerEmail || null,
      buyerPhone: normalized.buyerPhone || null,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      const existing = await Booking.findOne({
        storeConnection: storeConnection.id || storeConnection._id,
        externalOrderId: String(normalized.externalOrderId),
        source: platform,
      });
      if (existing) return { booking: existing, duplicate: true, payment: null };
    }
    await IntegrationEvent.updateOne(
      { _id: event._id },
      { status: 'failed', lastError: err.message }
    );
    throw err;
  }

  if (quoteMeta.quoteId) {
    await quoteBridge.markQuoteConsumed(quoteMeta.quoteId);
  }

  const payment = await paymentBridge.createPaymentForBooking(booking);

  await IntegrationEvent.updateOne(
    { _id: event._id },
    { status: 'processed', booking: booking._id }
  );

  storeConnection.lastWebhookAt = new Date();
  await storeConnection.save();

  return { booking, duplicate: false, payment };
};

/**
 * After logistics status change, push tracking back to the shop (best-effort).
 */
const pushStatusToShop = async (booking, statusPayload) => {
  if (!booking.storeConnection) return { pushed: false };
  const { StoreConnection } = require('../../models');
  const conn = await StoreConnection.findById(booking.storeConnection);
  if (!conn) return { pushed: false };
  const adapter = getAdapter(conn.platform);
  if (!adapter || typeof adapter.pushStatus !== 'function') {
    return { pushed: false };
  }
  try {
    await adapter.pushStatus(conn, booking, statusPayload);
    return { pushed: true };
  } catch (err) {
    return { pushed: false, error: err.message };
  }
};

module.exports = {
  claimEvent,
  ingestNormalizedOrder,
  pushStatusToShop,
};
