const crypto = require('crypto');
const httpStatus = require('http-status');
const { Trip, Parcel, DriverProfile, Booking } = require('../models');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');
const bookingSyncService = require('./bookingSync.service');

const driverName = (profile) => {
  if (!profile) return '—';
  if (profile.user && profile.user.name) return profile.user.name;
  return profile.employeeId || '—';
};

const generateTripCode = async () => {
  for (let i = 0; i < 8; i += 1) {
    const code = `TRP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Trip.findOne({ code }).select('_id');
    if (!exists) return code;
  }
  return `TRP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
};

const findApprovedDriver = async (employeeId) => {
  const profile = await DriverProfile.findOne({ employeeId }).populate('user', 'name email role');
  if (!profile || !profile.user || profile.user.role !== 'driver') {
    throw new ApiError(httpStatus.NOT_FOUND, `No registered driver with ID ${employeeId}`);
  }
  if (profile.approvalStatus && profile.approvalStatus !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Driver ${employeeId} is not approved yet`);
  }
  return profile;
};

const formatTrip = (trip, parcelIds = []) => {
  const plain = trip.toJSON ? trip.toJSON() : trip;
  const profile = plain.driverProfile || {};
  return {
    id: plain.code,
    tripId: plain.id,
    employeeId: profile.employeeId || '',
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
    parcelIds,
    clientOrderId: plain.clientOrderId || '',
  };
};

const parcelsByTripMap = async (tripIds) => {
  const parcels = await Parcel.find({ trip: { $in: tripIds } }).select('code trip');
  return parcels.reduce((acc, parcel) => {
    const key = String(parcel.trip);
    if (!acc[key]) acc[key] = [];
    acc[key].push(parcel.code);
    return acc;
  }, {});
};

const hydrateTrip = async (trip) => {
  const populated =
    trip.driverProfile && trip.driverProfile.user
      ? trip
      : await Trip.findById(trip._id || trip.id).populate({
          path: 'driverProfile',
          populate: { path: 'user', select: 'name email' },
        });
  const map = await parcelsByTripMap([populated._id]);
  return formatTrip(populated, map[String(populated._id)] || []);
};

const findTripOrThrow = async (tripId) => {
  const trip = await Trip.findById(tripId).populate({
    path: 'driverProfile',
    populate: { path: 'user', select: 'name email' },
  });
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }
  return trip;
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

  const parcelsByTrip = await parcelsByTripMap(trips.map((trip) => trip._id));

  return trips.map((trip) => formatTrip(trip, parcelsByTrip[String(trip._id)] || []));
};

const createTrip = async (body) => {
  const profile = await findApprovedDriver(body.employeeId);
  const trip = await Trip.create({
    code: await generateTripCode(),
    driverProfile: profile._id,
    vehicle: body.vehicle || profile.assignedVehicle || '',
    cargo: body.cargo,
    pickup: body.pickup,
    dropoff: body.dropoff,
    status: body.status || 'starting_soon',
    distanceKm: body.distanceKm || 0,
    startAt: new Date(),
    mode: body.mode || 'road',
    clientOrderId: body.clientOrderId || '',
  });
  await emailService.sendDriverAssignedEmail({
    booking: { code: trip.clientOrderId || trip.code, pickup: trip.pickup, dropoff: trip.dropoff },
    to: profile.user.email,
    driverName: profile.user.name,
  });
  return hydrateTrip(trip);
};

const updateTrip = async (tripId, body) => {
  const trip = await findTripOrThrow(tripId);
  if (trip.status === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cancelled trips cannot be edited');
  }
  ['vehicle', 'cargo', 'pickup', 'dropoff', 'mode', 'distanceKm', 'onTime', 'status'].forEach((field) => {
    if (body[field] !== undefined) trip[field] = body[field];
  });
  if (body.status === 'completed' || body.status === 'cancelled') {
    trip.endAt = trip.endAt || new Date();
  }
  await trip.save();
  return hydrateTrip(trip);
};

const reassignTrip = async (tripId, employeeId) => {
  const trip = await findTripOrThrow(tripId);
  if (trip.status === 'cancelled' || trip.status === 'completed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot reassign a completed or cancelled trip');
  }
  const profile = await findApprovedDriver(employeeId);
  trip.driverProfile = profile._id;
  if (profile.assignedVehicle) trip.vehicle = profile.assignedVehicle;
  await trip.save();
  await Parcel.updateMany({ trip: trip._id }, { driverProfile: profile._id });
  await emailService.sendDriverAssignedEmail({
    booking: { code: trip.clientOrderId || trip.code, pickup: trip.pickup, dropoff: trip.dropoff },
    to: profile.user.email,
    driverName: profile.user.name,
  });
  return hydrateTrip(trip);
};

const cancelTrip = async (tripId) => {
  const trip = await findTripOrThrow(tripId);
  if (trip.status === 'completed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Completed trips cannot be cancelled');
  }
  trip.status = 'cancelled';
  trip.endAt = new Date();
  await trip.save();
  await Parcel.updateMany({ trip: trip._id }, { status: 'cancelled' });

  if (trip.clientOrderId) {
    const booking = await Booking.findOne({ code: trip.clientOrderId }).populate('company', 'email');
    if (booking) {
      booking.status = 'history';
      await booking.save();
      await bookingSyncService.notifyBookingStatus(
        booking,
        'cancelled',
        'This trip was cancelled. We will follow up with a new plan shortly.'
      );
    }
  }

  return hydrateTrip(trip);
};

module.exports = {
  queryAllTrips,
  createTrip,
  updateTrip,
  reassignTrip,
  cancelTrip,
};
