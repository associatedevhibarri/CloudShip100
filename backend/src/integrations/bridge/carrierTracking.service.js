const logger = require('../../config/logger');
const { getAdapter } = require('../../services/carriers');
const {
  courierStatusToStage,
  bookingStatusFromStage,
  progressTimeline,
  displayShipmentStatus,
} = require('../utils/shipmentProgress');

const fingerprint = (booking, courierStatus) =>
  String(courierStatus || booking.courierStatus || displayShipmentStatus(booking) || '');

const TRACK_SKIP_MS = 30 * 60 * 1000;
const skipUntil = new Map();

const trackKey = (booking) =>
  String(booking.trackingNumber || booking.carrierShipmentId || booking.logisticsBookingRef || '');

const isPermissionTrackError = (err) =>
  /authorize your credentials|check your permissions/i.test(String((err && err.message) || ''));

const saveTracking = async (booking) => {
  if (typeof booking.save !== 'function') return;
  try {
    await booking.save();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      logger.warn(`Courier track skipped save for ${booking.code}: concurrent update`);
      return;
    }
    throw err;
  }
};

const refreshBookingTracking = async (booking) => {
  if (!booking) return booking;
  const partnerId = booking.partnerId || booking.selectedPartner;
  const adapter = getAdapter(partnerId);
  if (!adapter || typeof adapter.track !== 'function') return booking;
  const trackingNumber = booking.trackingNumber;
  const carrierShipmentId = booking.carrierShipmentId || booking.logisticsBookingRef;
  if (!trackingNumber && !carrierShipmentId) return booking;
  if (String(carrierShipmentId || '').startsWith('STUB-')) return booking;
  const key = trackKey(booking);
  if (key && Date.now() < (skipUntil.get(key) || 0)) return booking;

  try {
    const tracked = await adapter.track({ trackingNumber, carrierShipmentId });
    if (!tracked || !tracked.courierStatus) return booking;
    const stage = courierStatusToStage(tracked.courierStatus);
    booking.courierStatus = tracked.courierStatus;
    if (tracked.trackingUrl) booking.trackingUrl = tracked.trackingUrl;
    if (stage) {
      booking.status = bookingStatusFromStage(stage);
      booking.timeline = progressTimeline(booking.timeline, stage, new Date());
    }
    await saveTracking(booking);

    const nextFp = fingerprint(booking, tracked.courierStatus);
    const lastFp = String(booking.lastPushedCourierStatus || '');
    if (nextFp && nextFp !== lastFp) {
      const { pushStatusToShop } = require('./orderBridge.service');
      const result = await pushStatusToShop(booking, {
        status: stage || displayShipmentStatus(booking),
        courierStatus: tracked.courierStatus,
        trackingNumber: booking.trackingNumber,
      });
      if (result.pushed) {
        booking.lastPushedCourierStatus = nextFp;
        await saveTracking(booking);
      }
    }
  } catch (err) {
    if (isPermissionTrackError(err) && key) {
      skipUntil.set(key, Date.now() + TRACK_SKIP_MS);
    }
    logger.warn(`Courier track failed for ${booking.code || trackingNumber}: ${err.message}`);
  }
  return booking;
};

const refreshMany = async (bookings, { limit = 8 } = {}) => {
  const rows = (bookings || [])
    .filter((row) => row && (row.trackingNumber || row.carrierShipmentId || row.logisticsBookingRef))
    .filter((row) => row.status !== 'completed' && row.status !== 'history')
    .slice(0, limit);
  await Promise.all(rows.map((row) => refreshBookingTracking(row)));
  return bookings;
};

const pollActiveMarketplaceShipments = async () => {
  const { Booking } = require('../../models');
  const rows = await Booking.find({
    source: { $in: ['woocommerce', 'shopify', 'wix', 'lovable'] },
    status: { $in: ['pending', 'in_transit'] },
    $or: [
      { trackingNumber: { $nin: [null, ''] } },
      { logisticsBookingRef: { $nin: [null, ''] } },
    ],
  })
    .sort('-updatedAt')
    .limit(25);
  if (!rows.length) return 0;
  await refreshMany(rows, { limit: 25 });
  return rows.length;
};

const startTrackingPoller = () => {
  const tick = async () => {
    try {
      const count = await pollActiveMarketplaceShipments();
      if (count) logger.info(`Courier tracking poll refreshed ${count} shop shipment(s)`);
    } catch (err) {
      logger.warn(`Courier tracking poll failed: ${err.message}`);
    }
  };
  setTimeout(tick, 15000);
  setInterval(tick, 120000);
};

module.exports = {
  refreshBookingTracking,
  refreshMany,
  pollActiveMarketplaceShipments,
  startTrackingPoller,
};
