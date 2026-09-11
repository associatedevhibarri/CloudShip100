const httpStatus = require('http-status');
const { DriverProfile, Trip, Parcel, DamageLog, Booking } = require('../models');
const ApiError = require('../utils/ApiError');
const driverProfileService = require('./driverProfile.service');
const bookingSyncService = require('./bookingSync.service');

const MARKETPLACE_SOURCES = ['woocommerce', 'shopify', 'wix', 'lovable'];

const ALLOWED_NEXT_STATUS = {
  assigned: ['picked_up'],
  picked_up: ['in_transit'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
};

const formatTrip = (trip, parcelCodes = []) => ({
  id: trip.code,
  tripId: trip.id,
  driver: trip.driverProfile?.employeeId,
  vehicle: trip.vehicle,
  cargo: trip.cargo,
  pickup: trip.pickup,
  dropoff: trip.dropoff,
  status: trip.status,
  distanceKm: trip.distanceKm,
  eta: trip.eta,
  startAt: trip.startAt,
  endAt: trip.endAt,
  mode: trip.mode,
  onTime: trip.onTime,
  parcelIds: parcelCodes,
  clientOrderId: trip.clientOrderId,
});

const findBookingForDriverParcel = async (parcel) => {
  if (!parcel?.clientOrderId) return null;
  return Booking.findOne({ code: parcel.clientOrderId });
};

const enrichParcelFromBooking = (formatted, booking) => {
  if (!booking) {
    return {
      ...formatted,
      source: null,
      externalOrderId: null,
      paymentStatus: null,
      trackingNumber: null,
      logisticsBookingRef: null,
      actionsBlocked: false,
      actionsBlockedReason: null,
    };
  }

  const source = booking.source || null;
  const paymentStatus = booking.paymentStatus || null;
  const logisticsBookingRef = booking.logisticsBookingRef || null;
  const isMarketplace = MARKETPLACE_SOURCES.includes(String(source || ''));
  const unpaidMarketplace = isMarketplace && paymentStatus !== 'paid';
  const actionsBlocked = Boolean(logisticsBookingRef) || unpaidMarketplace;

  let actionsBlockedReason = null;
  if (logisticsBookingRef) {
    actionsBlockedReason = `External courier booked (${logisticsBookingRef})`;
  } else if (unpaidMarketplace) {
    actionsBlockedReason = 'Marketplace order is not paid';
  }

  return {
    ...formatted,
    source,
    externalOrderId: booking.externalOrderId || null,
    paymentStatus,
    trackingNumber: booking.trackingNumber || null,
    logisticsBookingRef,
    actionsBlocked,
    actionsBlockedReason,
  };
};

const formatParcel = (parcel, booking = null) => {
  const base = {
    id: parcel.code,
    parcelId: parcel.id,
    tripId: parcel.trip?.code || null,
    status: parcel.status,
    weight: parcel.weight,
    cargo: parcel.cargo,
    pickup: parcel.pickup,
    dropoff: parcel.dropoff,
    recipientName: parcel.recipientName,
    recipientPhone: parcel.recipientPhone,
    clientName: parcel.clientName,
    clientOrderId: parcel.clientOrderId,
    barcode: parcel.barcode,
    instructions: parcel.instructions,
  };
  return enrichParcelFromBooking(base, booking);
};

const formatParcelWithBooking = async (parcelDoc) => {
  const plain = parcelDoc.toJSON ? parcelDoc.toJSON() : parcelDoc;
  const booking = await findBookingForDriverParcel(plain);
  return formatParcel(plain, booking);
};

const formatDamageLog = (log) => ({
  id: log.code,
  damageLogId: log.id,
  parcelId: log.parcel?.code || null,
  tripId: log.trip?.code || null,
  severity: log.severity,
  description: log.description,
  location: log.location,
  reportedAt: log.reportedAt,
  status: log.status,
  photoUrl: log.photoUrl || null,
});

const getUserId = (user) => user.id || user._id;

const getDriverProfile = async (user) => {
  const userId = getUserId(user);
  let profile = await DriverProfile.findOne({ user: userId });
  if (!profile) {
    await driverProfileService.getOrCreateProfileByUserId(user);
    profile = await DriverProfile.findOne({ user: userId });
  }
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver profile not found');
  }
  return profile;
};

const DRIVER_TO_TRIP_STATUS = {
  assigned: 'starting_soon',
  picked_up: 'in_progress',
  in_transit: 'in_progress',
  delivered: 'completed',
};

const syncTripFromParcelStatus = async (parcel, status) => {
  const tripId = parcel.trip?.id || parcel.trip;
  if (!tripId) return;

  const trip = parcel.trip?.code ? parcel.trip : await Trip.findById(tripId);
  if (!trip || trip.status === 'completed') return;

  if (status === 'delivered') {
    const remaining = await Parcel.countDocuments({
      trip: trip.id,
      _id: { $ne: parcel.id },
      status: { $nin: ['delivered', 'cancelled'] },
    });
    if (remaining === 0) {
      trip.status = 'completed';
      trip.endAt = new Date();
      await trip.save();
    }
    return;
  }

  const nextStatus = DRIVER_TO_TRIP_STATUS[status];
  if (!nextStatus) return;
  trip.status = nextStatus;
  if (status === 'picked_up' || status === 'in_transit') {
    trip.startAt = trip.startAt || new Date();
  }
  await trip.save();
};

const assertParcelStatusTransition = (currentStatus, nextStatus) => {
  const allowed = ALLOWED_NEXT_STATUS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid status transition: ${currentStatus} → ${nextStatus}. Allowed next: ${allowed.join(', ') || 'none'}`
    );
  }
};

const assertParcelNotStaleForDriver = (booking, parcelCode) => {
  if (!booking) return;

  if (booking.logisticsBookingRef) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `Parcel ${parcelCode} is fulfilled by external courier (${booking.logisticsBookingRef}) — driver cannot update status`
    );
  }

  const isMarketplace = MARKETPLACE_SOURCES.includes(String(booking.source || ''));
  if (isMarketplace && booking.paymentStatus !== 'paid') {
    throw new ApiError(
      httpStatus.CONFLICT,
      `Parcel ${parcelCode} belongs to an unpaid marketplace order — driver cannot update status`
    );
  }
};

const getParcelCodesForTrip = async (tripId) => {
  const parcels = await Parcel.find({ trip: tripId }).select('code');
  return parcels.map((p) => p.code);
};

const filterTripsByBucket = (trips, bucket) => {
  if (!bucket || bucket === 'all') return trips;
  if (bucket === 'active') {
    return trips.filter((t) => t.status === 'in_progress' || t.status === 'ending_soon');
  }
  if (bucket === 'upcoming') {
    return trips.filter((t) => t.status === 'starting_soon');
  }
  if (bucket === 'completed') {
    return trips.filter((t) => t.status === 'completed');
  }
  return trips.filter((t) => t.status === bucket);
};

const getMyTrips = async (user, bucket) => {
  const profile = await getDriverProfile(user);

  const trips = await Trip.find({ driverProfile: profile.id }).sort({ startAt: -1 });
  const filtered = filterTripsByBucket(trips, bucket);

  const formatted = await Promise.all(
    filtered.map(async (trip) => {
      const parcelCodes = await getParcelCodesForTrip(trip.id);
      return formatTrip(trip.toJSON(), parcelCodes);
    })
  );

  return formatted;
};

const getMyParcels = async (user, status) => {
  const profile = await getDriverProfile(user);

  const query = { driverProfile: profile.id };
  if (status) query.status = status;

  const parcels = await Parcel.find(query).populate('trip').sort({ updatedAt: -1 });
  return Promise.all(parcels.map((parcel) => formatParcelWithBooking(parcel)));
};

const updateMyParcelStatus = async (user, parcelCode, status) => {
  const profile = await getDriverProfile(user);
  const parcel = await Parcel.findOne({ driverProfile: profile.id, code: parcelCode }).populate('trip');

  if (!parcel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parcel not found');
  }

  assertParcelStatusTransition(parcel.status, status);

  const booking = await findBookingForDriverParcel(parcel);
  assertParcelNotStaleForDriver(booking, parcelCode);

  parcel.status = status;
  await parcel.save();
  await syncTripFromParcelStatus(parcel, status);
  await bookingSyncService.syncBookingFromParcelStatus(parcel.clientOrderId, status);

  return formatParcel(parcel.toJSON(), booking);
};

const getMyDamageLogs = async (user) => {
  const profile = await getDriverProfile(user);

  const logs = await DamageLog.find({ driverProfile: profile.id })
    .populate('parcel')
    .populate('trip')
    .sort({ reportedAt: -1 });

  return logs.map((log) => formatDamageLog(log.toJSON()));
};

const createDamageLog = async (user, body, file) => {
  const profile = await getDriverProfile(user);

  const parcel = body.parcelId
    ? await Parcel.findOne({ driverProfile: profile.id, code: body.parcelId })
    : null;
  const trip = body.tripId ? await Trip.findOne({ driverProfile: profile.id, code: body.tripId }) : null;

  if (body.parcelId && !parcel) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid parcel for this driver');
  }
  if (body.tripId && !trip) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid trip for this driver');
  }

  let photoFields = {};
  if (file?.buffer) {
    const cloudinaryService = require('./cloudinary.service');
    const uploaded = await cloudinaryService.uploadBuffer(file.buffer, {
      folder: cloudinaryService.FOLDERS.damageLogs,
      resourceType: 'image',
    });
    photoFields = {
      photoUrl: uploaded.url,
      photoFilename: uploaded.publicId,
    };
  }

  const count = await DamageLog.countDocuments({ driverProfile: profile.id });
  const log = await DamageLog.create({
    code: `DMG-${String(count + 1).padStart(3, '0')}`,
    driverProfile: profile.id,
    parcel: parcel?.id,
    trip: trip?.id,
    severity: body.severity,
    description: body.description,
    location: body.location || 'Current location',
    status: 'open',
    reportedAt: new Date(),
    ...photoFields,
  });

  await log.populate('parcel');
  await log.populate('trip');
  return formatDamageLog(log.toJSON());
};

const getMyHistory = async (user) => {
  const profile = await getDriverProfile(user);

  const completedTrips = await Trip.find({ driverProfile: profile.id, status: 'completed' }).sort({ endAt: -1 });
  const deliveredParcels = await Parcel.find({ driverProfile: profile.id, status: 'delivered' }).populate('trip');
  const incidents = await DamageLog.find({ driverProfile: profile.id });

  const formattedTrips = await Promise.all(
    completedTrips.map(async (trip) => {
      const parcelCodes = await getParcelCodesForTrip(trip.id);
      return formatTrip(trip.toJSON(), parcelCodes);
    })
  );

  const formattedParcels = await Promise.all(deliveredParcels.map((p) => formatParcelWithBooking(p)));

  return {
    completedTrips: formattedTrips,
    deliveredParcels: formattedParcels,
    incidents: incidents.length,
    totalDeliveries: deliveredParcels.length,
    totalTrips: completedTrips.length,
    totalIncidents: incidents.length,
  };
};

const getMyDashboard = async (user) => {
  const profile = await getDriverProfile(user);

  const tripsRaw = await Trip.find({ driverProfile: profile.id }).sort({ startAt: -1 });
  const formattedTrips = await Promise.all(
    tripsRaw.map(async (trip) => {
      const parcelCodes = await getParcelCodesForTrip(trip.id);
      return formatTrip(trip.toJSON(), parcelCodes);
    })
  );

  const [parcels, damageLogs, history] = await Promise.all([
    getMyParcels(user),
    getMyDamageLogs(user),
    getMyHistory(user),
  ]);

  return {
    profile: {
      id: profile.employeeId,
      employeeId: profile.employeeId,
      name: user.name,
      assignedVehicle: profile.assignedVehicle,
    },
    trips: formattedTrips,
    activeTrips: filterTripsByBucket(formattedTrips, 'active'),
    upcomingTrips: filterTripsByBucket(formattedTrips, 'upcoming'),
    completedTrips: filterTripsByBucket(formattedTrips, 'completed'),
    parcels,
    damageLogs,
    history,
  };
};

module.exports = {
  getMyTrips,
  getMyParcels,
  updateMyParcelStatus,
  getMyDamageLogs,
  createDamageLog,
  getMyHistory,
  getMyDashboard,
  ALLOWED_NEXT_STATUS,
  MARKETPLACE_SOURCES,
};
