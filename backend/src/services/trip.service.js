const { Trip, Parcel } = require('../models');

const driverName = (profile) => {
  if (!profile) return '—';
  if (profile.user && profile.user.name) return profile.user.name;
  return profile.employeeId || '—';
};

/**
 * Operator list of all driver trips.
 * @param {Object} [filter]
 * @param {string} [filter.status]
 * @param {string} [filter.mode]
 * @returns {Promise<Array>}
 */
const queryAllTrips = async (filter = {}) => {
  const query = {};
  if (filter.status) query.status = filter.status;
  if (filter.mode) query.mode = filter.mode;

  const trips = await Trip.find(query)
    .populate({ path: 'driverProfile', populate: { path: 'user', select: 'name email' } })
    .sort({ startAt: -1 });

  const parcels = await Parcel.find({ trip: { $in: trips.map((trip) => trip._id) } }).select('code trip');
  const parcelsByTrip = parcels.reduce((acc, parcel) => {
    const key = String(parcel.trip);
    if (!acc[key]) acc[key] = [];
    acc[key].push(parcel.code);
    return acc;
  }, {});

  return trips.map((trip) => {
    const plain = trip.toJSON();
    const profile = plain.driverProfile || {};
    return {
      id: plain.code,
      tripId: plain.id,
      driver: driverName(profile),
      vehicle: plain.vehicle || profile.assignedVehicle || '',
      cargo: plain.cargo,
      pickup: plain.pickup,
      dropoff: plain.dropoff,
      status: plain.status,
      mode: plain.mode,
      distanceKm: Number(plain.distanceKm) || 0,
      eta: plain.eta || null,
      startAt: plain.startAt || null,
      endAt: plain.endAt || null,
      onTime: Boolean(plain.onTime),
      parcelIds: parcelsByTrip[String(trip._id)] || [],
      clientOrderId: plain.clientOrderId || '',
    };
  });
};

module.exports = {
  queryAllTrips,
};
