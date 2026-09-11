/**
 * One-time / ops cleanup for stale own-fleet parcels left before paid-only warehouse ingest.
 *
 * Marks open warehouse + driver parcels as cancelled when their Booking is:
 *   - marketplace (woocommerce|shopify|wix|lovable) AND paymentStatus !== 'paid', OR
 *   - has logisticsBookingRef (external courier already booked)
 *
 * Does NOT delete history rows. Does NOT touch delivered parcels.
 *
 * Usage:
 *   node backend/scripts/cleanupStaleMarketplaceParcels.js
 *   node backend/scripts/cleanupStaleMarketplaceParcels.js --dry-run
 */
require('../src/polyfills/slowBuffer');
const mongoose = require('mongoose');
const config = require('../src/config/config');
const { Booking, Parcel: DriverParcel } = require('../src/models');
const { Parcel: WarehouseParcel, WarehouseDriver } = require('../src/models/warehouse.model');

const MARKETPLACE_SOURCES = ['woocommerce', 'shopify', 'wix', 'lovable'];
const OPEN_DRIVER_STATUSES = ['assigned', 'picked_up', 'in_transit'];
const TERMINAL_WAREHOUSE = new Set(['delivered', 'cancelled']);

const dryRun = process.argv.includes('--dry-run');

const isStaleBooking = (booking) => {
  if (!booking) return false;
  if (booking.logisticsBookingRef) return true;
  const marketplace = MARKETPLACE_SOURCES.includes(String(booking.source || ''));
  return marketplace && booking.paymentStatus !== 'paid';
};

const main = async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);

  const staleBookings = await Booking.find({
    $or: [
      { logisticsBookingRef: { $type: 'string', $ne: '' } },
      {
        source: { $in: MARKETPLACE_SOURCES },
        paymentStatus: { $ne: 'paid' },
      },
    ],
  }).select('code externalOrderId source paymentStatus logisticsBookingRef');

  const codes = staleBookings.map((b) => b.code).filter(Boolean);
  const bookingIds = staleBookings.map((b) => String(b.id || b._id));

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        dryRun,
        staleBookingCount: staleBookings.length,
        sample: staleBookings.slice(0, 5).map((b) => ({
          code: b.code,
          source: b.source,
          paymentStatus: b.paymentStatus,
          logisticsBookingRef: b.logisticsBookingRef,
        })),
      },
      null,
      2
    )
  );

  if (!codes.length && !bookingIds.length) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ warehouseUpdated: 0, driverUpdated: 0 }));
    await mongoose.disconnect();
    return;
  }

  const warehouseQuery = {
    status: { $nin: [...TERMINAL_WAREHOUSE] },
    $or: [{ orderId: { $in: codes } }, { bookingId: { $in: bookingIds } }],
  };

  const driverQuery = {
    status: { $in: OPEN_DRIVER_STATUSES },
    clientOrderId: { $in: codes },
  };

  const [warehouseHits, driverHits] = await Promise.all([
    WarehouseParcel.find(warehouseQuery).select('code orderId status driverEmployeeId'),
    DriverParcel.find(driverQuery).select('code clientOrderId status'),
  ]);

  // Extra safety: only cancel if booking still matches stale rule
  const staleByCode = new Map(staleBookings.filter((b) => b.code).map((b) => [b.code, b]));
  const warehouseToCancel = warehouseHits.filter((p) => {
    const booking = staleByCode.get(p.orderId);
    return booking ? isStaleBooking(booking) : Boolean(p.orderId && codes.includes(p.orderId));
  });
  const driverToCancel = driverHits.filter((p) => {
    const booking = staleByCode.get(p.clientOrderId);
    return booking ? isStaleBooking(booking) : false;
  });

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          wouldCancelWarehouse: warehouseToCancel.map((p) => p.code),
          wouldCancelDriver: driverToCancel.map((p) => p.code),
        },
        null,
        2
      )
    );
    await mongoose.disconnect();
    return;
  }

  const warehouseCodes = warehouseToCancel.map((p) => p.code);
  const driverCodes = driverToCancel.map((p) => p.code);

  const [warehouseResult, driverResult] = await Promise.all([
    WarehouseParcel.updateMany(
      { code: { $in: warehouseCodes } },
      {
        $set: {
          status: 'cancelled',
          fleetType: null,
          truck: null,
          driver: null,
          driverEmployeeId: null,
          partner: null,
        },
      }
    ),
    DriverParcel.updateMany({ code: { $in: driverCodes } }, { $set: { status: 'cancelled' } }),
  ]);

  // Pull cancelled warehouse parcels out of driver assignedParcels lists
  await Promise.all(
    warehouseToCancel.map(async (p) => {
      if (!p.driverEmployeeId) return;
      await WarehouseDriver.updateMany(
        { employeeId: p.driverEmployeeId },
        { $pull: { assignedParcels: p.code } }
      );
    })
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      warehouseUpdated: warehouseResult.modifiedCount,
      driverUpdated: driverResult.modifiedCount,
      warehouseCodes,
      driverCodes,
    })
  );

  await mongoose.disconnect();
};

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
