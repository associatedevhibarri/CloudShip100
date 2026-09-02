const catchAsync = require('../utils/catchAsync');
const { companyService, bookingService } = require('../services');

const getMyBookings = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const bookings = await bookingService.queryBookingsByCompany(company.id);
  res.send(bookings);
});

module.exports = {
  getMyBookings,
};
