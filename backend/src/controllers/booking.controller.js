const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { companyService, bookingService } = require('../services');

const getMyBookings = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const bookings = await bookingService.queryBookingsByCompany(company.id);
  res.send(bookings);
});

const createMyBooking = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const booking = await bookingService.createBooking(company, req.body);
  res.status(httpStatus.CREATED).send(booking);
});

module.exports = {
  getMyBookings,
  createMyBooking,
};
