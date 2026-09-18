const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');
const { companyService, bookingService } = require('../services');
const carrierTracking = require('../integrations/bridge/carrierTracking.service');
const orderBridge = require('../integrations/bridge/orderBridge.service');

const getMyBookings = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const bookings = await bookingService.queryBookingsByCompany(company.id);
  await orderBridge.hydrateShopOrderTotals(bookings);
  carrierTracking.refreshMany(bookings).catch((err) => {
    logger.warn(`Courier track refresh skipped: ${err.message}`);
  });
  res.send(bookings);
});

const createBooking = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const booking = await bookingService.createBooking(company, req.body, req.user);
  res.status(httpStatus.CREATED).send(booking);
});

const getAllBookings = catchAsync(async (req, res) => {
  const bookings = await bookingService.queryAllBookings(req.query.status);
  await orderBridge.hydrateShopOrderTotals(bookings);
  res.send(bookings);
});

module.exports = {
  getMyBookings,
  getAllBookings,
  createBooking,
};
