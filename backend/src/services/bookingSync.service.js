/* eslint-disable no-param-reassign */
const { Booking } = require('../models');
const { Parcel: WarehouseParcel } = require('../models/warehouse.model');
const { TIMELINE_STAGE_ORDER } = require('./booking.service');

// Driver Portal parcel status -> the furthest Booking timeline stage it implies.
const STATUS_TO_STAGE = {
  assigned: 'warehouse',
  picked_up: 'in_transit',
  in_transit: 'out_for_delivery',
  delivered: 'delivered',
};

const STATUS_TO_BOOKING_STATUS = {
  assigned: 'pending',
  picked_up: 'in_transit',
  in_transit: 'in_transit',
  delivered: 'completed',
};

/**
 * Propagate a driver/warehouse parcel status change back to the originating Booking
 * (found by matching the warehouse parcel's `orderId` / driver parcel's `clientOrderId`
 * against `Booking.code`), and mirror the status onto the WarehouseParcel too.
 * A silent no-op if no Booking matches (e.g. legacy seeded demo parcels).
 * @param {string} clientOrderId
 * @param {string} driverParcelStatus - assigned | picked_up | in_transit | delivered
 */
const syncBookingFromParcelStatus = async (clientOrderId, driverParcelStatus) => {
  if (!clientOrderId) return;
  const targetStage = STATUS_TO_STAGE[driverParcelStatus];
  if (!targetStage) return;

  const booking = await Booking.findOne({ code: clientOrderId });
  if (!booking) return;

  const targetIndex = TIMELINE_STAGE_ORDER.indexOf(targetStage);
  const now = new Date();
  booking.timeline.forEach((step) => {
    const stepIndex = TIMELINE_STAGE_ORDER.indexOf(step.stage);
    if (stepIndex !== -1 && stepIndex <= targetIndex && !step.done) {
      step.done = true;
      step.timestamp = step.timestamp || now;
    }
  });
  booking.status = STATUS_TO_BOOKING_STATUS[driverParcelStatus] || booking.status;
  await booking.save();

  await WarehouseParcel.findOneAndUpdate({ orderId: clientOrderId }, { status: driverParcelStatus });
};

module.exports = {
  syncBookingFromParcelStatus,
};
