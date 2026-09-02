const httpStatus = require('http-status');
const { Booking, Contract, Invoice, PaymentRequest, Notification } = require('../models');
const pricingService = require('./pricing.service');
const ApiError = require('../utils/ApiError');

const TIMELINE_STAGE_ORDER = ['booked', 'warehouse', 'in_transit', 'out_for_delivery', 'delivered'];

const TIMELINE_TEMPLATE = [
  { stage: 'booked', label: 'Booked' },
  { stage: 'warehouse', label: 'Warehouse' },
  { stage: 'in_transit', label: 'In Transit' },
  { stage: 'out_for_delivery', label: 'Out for Delivery' },
  { stage: 'delivered', label: 'Delivered' },
];

/**
 * Get all bookings for a company
 * @param {ObjectId} companyId
 * @returns {Promise<Booking[]>}
 */
const queryBookingsByCompany = async (companyId) => {
  return Booking.find({ company: companyId }).sort('-bookedAt');
};

const generateBookingCode = async () => {
  const count = await Booking.countDocuments();
  return `BKG-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Create a booking: quote via the pricing engine when weight is given, generate the matching
 * Contract / Invoice / PaymentRequest / Notification, and ingest an expected inbound parcel
 * so warehouse receiving still has to confirm arrival.
 * @param {Company} company
 * @param {Object} body - { pickup, dropoff, cargo, mode, weightKg?, value? }
 * @returns {Promise<Booking>}
 */
const createBooking = async (company, body) => {
  const { pickup, dropoff, cargo, weightKg, mode, value } = body;

  let quotedPickup = pickup;
  let quotedDropoff = dropoff;
  let price = value;
  let distanceKm = null;
  let durationMinutes = null;

  if (weightKg) {
    const quote = await pricingService.getQuote({ pickup, dropoff, weightKg, mode });
    quotedPickup = quote.pickup;
    quotedDropoff = quote.dropoff;
    price = quote.price;
    distanceKm = quote.distanceKm;
    durationMinutes = quote.durationMinutes;
  }

  if (price == null) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'weightKg or value is required');
  }

  const code = await generateBookingCode();
  const now = new Date();
  const timeline = TIMELINE_TEMPLATE.map((step, i) => ({
    ...step,
    timestamp: i === 0 ? now : null,
    done: i === 0,
  }));

  const booking = await Booking.create({
    company: company.id,
    code,
    status: 'pending',
    mode,
    cargo,
    value: price,
    pickup: quotedPickup,
    dropoff: quotedDropoff,
    distanceKm,
    durationMinutes,
    timeline,
    bookedAt: now,
  });

  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await Contract.create({
    company: company.id,
    booking: booking.id,
    title: `${mode} Freight — ${quotedPickup} to ${quotedDropoff}`,
    price,
    pickup: quotedPickup,
    destination: quotedDropoff,
    terms: `Payment due within 7 days of delivery. Carrier liable for damage up to contract value. Booking reference ${code}.`,
    status: 'pending_signature',
    startDate: now,
    endDate: dueDate,
  });

  const invoice = await Invoice.create({
    company: company.id,
    booking: booking.id,
    amount: price,
    status: 'Open',
    due: dueDate,
  });

  await PaymentRequest.create({
    company: company.id,
    invoice: invoice.id,
    amount: price,
    dueDate,
    status: 'due',
  });

  await Notification.create({
    company: company.id,
    title: `Booking ${code} confirmed`,
    body: `Your shipment from ${quotedPickup} to ${quotedDropoff} has been booked. Estimated price $${Number(price).toFixed(
      2
    )}.`,
    type: 'booking',
    unread: true,
  });

  // Lazy require avoids a cycle: warehouse.service -> bookingSync.service -> booking.service.
  // eslint-disable-next-line global-require
  const warehouseService = require('./warehouse.service');
  await warehouseService.ingestBooking(booking, company, { weightKg });

  return booking;
};

module.exports = {
  queryBookingsByCompany,
  createBooking,
  TIMELINE_STAGE_ORDER,
};
