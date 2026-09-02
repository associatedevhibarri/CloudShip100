const { Booking } = require('../models');

/**
 * Get all bookings for a company
 * @param {ObjectId} companyId
 * @returns {Promise<Booking[]>}
 */
const queryBookingsByCompany = async (companyId) => {
  return Booking.find({ company: companyId }).sort('-bookedAt');
};

module.exports = {
  queryBookingsByCompany,
};
