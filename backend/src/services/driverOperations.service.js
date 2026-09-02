const httpStatus = require('http-status');
const { DriverProfile, Trip, Parcel, DamageLog } = require('../models');
const ApiError = require('../utils/ApiError');
const { driverProfileService } = require('./driverProfile.service');
const bookingSyncService = require('./bookingSync.service');

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

const formatParcel = (parcel) => ({
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
});

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

const getDriverProfile = async (user) => {
  let profile = await DriverProfile.findOne({ user: user.id });
  if (!profile) {
    await driverProfileService.getOrCreateProfileByUserId(user);
    profile = await DriverProfile.findOne({ user: user.id });
  }
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver profile not found');
  }
  return profile;
};

const ensureDriverSeedData = async (profile) => {
  const [existingTrips, existingParcels] = await Promise.all([
    Trip.countDocuments({ driverProfile: profile.id }),
    Parcel.countDocuments({ driverProfile: profile.id }),
  ]);
  if (existingTrips > 0 || existingParcels > 0) return;

  if (!profile.assignedVehicle) {
    profile.assignedVehicle = 'XYX 767 GP';
    await profile.save();
  }

  const activeTrip = await Trip.create({
    code: 'TRP-1001',
    driverProfile: profile.id,
    vehicle: profile.assignedVehicle,
    cargo: 'Steel coils — 34 Tons',
    pickup: '8 Merr Road, Durban, SA',
    dropoff: '71 Shika Uwada, Lusaka, Zambia',
    status: 'in_progress',
    distanceKm: 4781,
    eta: new Date('2026-08-28T14:00:00'),
    startAt: new Date('2026-08-24T06:00:00'),
    endAt: new Date('2026-08-28T18:00:00'),
    mode: 'road',
    onTime: true,
  });

  const completedTrip1 = await Trip.create({
    code: 'TRP-1009',
    driverProfile: profile.id,
    vehicle: profile.assignedVehicle,
    cargo: 'Mining spare parts — 12 Tons',
    pickup: 'Johannesburg Yard',
    dropoff: 'Rustenburg Depot',
    status: 'completed',
    distanceKm: 180,
    endAt: new Date('2026-08-20T15:45:00'),
    startAt: new Date('2026-08-20T08:00:00'),
    mode: 'road',
    onTime: true,
  });

  const completedTrip2 = await Trip.create({
    code: 'TRP-1010',
    driverProfile: profile.id,
    vehicle: profile.assignedVehicle,
    cargo: 'Pharma pallets — 8 Tons',
    pickup: 'Cape Town Port',
    dropoff: 'Bloemfontein Clinic Hub',
    status: 'completed',
    distanceKm: 990,
    endAt: new Date('2026-08-15T13:30:00'),
    startAt: new Date('2026-08-14T06:00:00'),
    mode: 'road',
    onTime: true,
  });

  const parcelDefs = [
    {
      code: 'PRATIK1',
      trip: activeTrip.id,
      status: 'in_transit',
      weight: '100 kg',
      cargo: '100kg rice — AfriMetals order',
      pickup: 'Vasanth Warehouse, Durban',
      dropoff: 'Pratik Mane, Johannesburg',
      recipientName: 'Pratik Mane',
      recipientPhone: '+27 82 441 2201',
      clientName: 'AfriMetals Pty',
      clientOrderId: 'ORD-8801',
      barcode: 'CS-PRATIK1-2026',
      instructions: 'Call recipient 30 min before arrival. Gate code: 4421.',
    },
    {
      code: 'DEEPAK2',
      trip: activeTrip.id,
      status: 'assigned',
      weight: '45 kg',
      cargo: 'Electronics accessories',
      pickup: 'Durban Hub, Zone B',
      dropoff: 'Deepak Singh, Pietermaritzburg',
      recipientName: 'Deepak Singh',
      recipientPhone: '+27 71 882 1093',
      clientName: 'Zambezi Retail Group',
      clientOrderId: 'ORD-8802',
      barcode: 'CS-DEEPAK2-2026',
      instructions: 'Same zone as PRATIK1 — bundled delivery.',
    },
    {
      code: 'PKG-8803',
      trip: activeTrip.id,
      status: 'picked_up',
      weight: '34 Tons',
      cargo: 'Steel coils',
      pickup: '8 Merr Road, Durban, SA',
      dropoff: '71 Shika Uwada, Lusaka, Zambia',
      recipientName: 'Lebo Khumalo',
      recipientPhone: '+27 11 555 0101',
      clientName: 'AfriMetals Pty',
      clientOrderId: 'ORD-8803',
      barcode: 'CS-PKG8803-2026',
      instructions: 'Cross-border docs verified. Hazmat certified driver required.',
    },
    {
      code: 'PKG-8804',
      trip: completedTrip1.id,
      status: 'delivered',
      weight: '12 Tons',
      cargo: 'Mining spare parts',
      pickup: 'Johannesburg Yard',
      dropoff: 'Rustenburg Depot',
      recipientName: 'Johan Steyn',
      recipientPhone: '+27 83 220 7711',
      clientName: 'AfriMetals Pty',
      clientOrderId: 'ORD-8804',
      barcode: 'CS-PKG8804-2026',
      instructions: 'Delivered 2026-08-20. POD signed.',
    },
    {
      code: 'PKG-8805',
      trip: completedTrip2.id,
      status: 'delivered',
      weight: '8 Tons',
      cargo: 'Pharma pallets',
      pickup: 'Cape Town Port',
      dropoff: 'Bloemfontein Clinic Hub',
      recipientName: 'Dr. Naledi Mokoena',
      recipientPhone: '+27 51 555 0199',
      clientName: 'Cape Pharma Distributors',
      clientOrderId: 'ORD-8805',
      barcode: 'CS-PKG8805-2026',
      instructions: 'Cold chain maintained. Delivered on time.',
    },
  ];

  await Parcel.insertMany(
    parcelDefs.map((parcel) => ({
      ...parcel,
      driverProfile: profile.id,
    }))
  );

  await DamageLog.create({
    code: 'DMG-001',
    driverProfile: profile.id,
    parcel: (await Parcel.findOne({ code: 'PKG-8804', driverProfile: profile.id }))?.id,
    trip: completedTrip1.id,
    severity: 'minor',
    description: 'Outer carton dented during yard loading. Contents intact.',
    location: 'Johannesburg Yard, Bay 3',
    reportedAt: new Date('2026-08-20T09:15:00'),
    status: 'resolved',
  });

  await DamageLog.create({
    code: 'DMG-002',
    driverProfile: profile.id,
    parcel: (await Parcel.findOne({ code: 'PRATIK1', driverProfile: profile.id }))?.id,
    trip: activeTrip.id,
    severity: 'minor',
    description: 'Pallet wrap torn — re-wrapped at checkpoint.',
    location: 'N3 Highway Rest Stop, Harrismith',
    reportedAt: new Date('2026-08-25T14:30:00'),
    status: 'open',
  });
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
  await ensureDriverSeedData(profile);

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
  await ensureDriverSeedData(profile);

  const query = { driverProfile: profile.id };
  if (status) query.status = status;

  const parcels = await Parcel.find(query).populate('trip').sort({ updatedAt: -1 });
  return parcels.map((parcel) => formatParcel(parcel.toJSON()));
};

const updateMyParcelStatus = async (user, parcelCode, status) => {
  const profile = await getDriverProfile(user);
  const parcel = await Parcel.findOne({ driverProfile: profile.id, code: parcelCode }).populate('trip');

  if (!parcel) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parcel not found');
  }

  parcel.status = status;
  await parcel.save();
  await bookingSyncService.syncBookingFromParcelStatus(parcel.clientOrderId, status);

  return formatParcel(parcel.toJSON());
};

const getMyDamageLogs = async (user) => {
  const profile = await getDriverProfile(user);
  await ensureDriverSeedData(profile);

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
    ...(file
      ? {
          photoUrl: `/v1/uploads/damage-logs/${file.filename}`,
          photoFilename: file.filename,
        }
      : {}),
  });

  await log.populate('parcel');
  await log.populate('trip');
  return formatDamageLog(log.toJSON());
};

const getMyHistory = async (user) => {
  const profile = await getDriverProfile(user);
  await ensureDriverSeedData(profile);

  const completedTrips = await Trip.find({ driverProfile: profile.id, status: 'completed' }).sort({ endAt: -1 });
  const deliveredParcels = await Parcel.find({ driverProfile: profile.id, status: 'delivered' }).populate('trip');
  const incidents = await DamageLog.find({ driverProfile: profile.id });

  const formattedTrips = await Promise.all(
    completedTrips.map(async (trip) => {
      const parcelCodes = await getParcelCodesForTrip(trip.id);
      return formatTrip(trip.toJSON(), parcelCodes);
    })
  );

  return {
    completedTrips: formattedTrips,
    deliveredParcels: deliveredParcels.map((p) => formatParcel(p.toJSON())),
    incidents: incidents.length,
    totalDeliveries: deliveredParcels.length,
    totalTrips: completedTrips.length,
    totalIncidents: incidents.length,
  };
};

const getMyDashboard = async (user) => {
  const profile = await getDriverProfile(user);
  await ensureDriverSeedData(profile);

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
};
