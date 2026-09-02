const { Booking } = require('../models');
const warehouseService = require('./warehouse.service');

const defaultTimeline = () => {
  const now = new Date();
  return [
    { stage: 'booked', label: 'Booked', timestamp: now, done: true },
    { stage: 'warehouse', label: 'Received at warehouse', timestamp: null, done: false },
    { stage: 'in_transit', label: 'In transit', timestamp: null, done: false },
    { stage: 'delivered', label: 'Delivered', timestamp: null, done: false },
  ];
};

const nextOrderCode = async () => {
  const bookings = await Booking.find({ code: /^ORD-/ }).select('code');
  const max = bookings.reduce((acc, doc) => {
    const n = parseInt(String(doc.code).replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 8811);
  return `ORD-${max + 1}`;
};

/**
 * Get all bookings for a company
 * @param {ObjectId} companyId
 * @returns {Promise<Booking[]>}
 */
const queryBookingsByCompany = async (companyId) => {
  return Booking.find({ company: companyId }).sort('-bookedAt');
};

/**
 * Customer books a shipment; warehouse sees it as expected inbound until received.
 * @param {Company} company
 * @param {Object} body
 * @returns {Promise<Booking>}
 */
const createBooking = async (company, body) => {
  const booking = await Booking.create({
    company: company.id,
    code: await nextOrderCode(),
    status: 'pending',
    mode: body.mode,
    cargo: body.cargo,
    value: body.value,
    pickup: body.pickup,
    dropoff: body.dropoff,
    timeline: defaultTimeline(),
    bookedAt: new Date(),
  });
  await warehouseService.ingestBooking(booking, company);
  return booking;
};

module.exports = {
  queryBookingsByCompany,
  createBooking,
};
