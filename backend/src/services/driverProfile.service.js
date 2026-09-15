const httpStatus = require('http-status');
const { DriverProfile, User, Trip } = require('../models');
const ApiError = require('../utils/ApiError');
const { getProfileCompleteness } = require('../utils/driverProfileCompleteness');
const cloudinaryService = require('./cloudinary.service');

const formatProfileResponse = (profile, user) => {
  const plain = profile.toJSON();
  const completeness = getProfileCompleteness(plain);

  return {
    ...plain,
    name: user.name,
    email: user.email,
    completeness,
  };
};

const generateEmployeeId = async () => {
  const count = await DriverProfile.countDocuments();
  return `DRV-${String(count + 1).padStart(2, '0')}`;
};

const getOrCreateProfileByUserId = async (user) => {
  const userId = user.id || user._id;
  let profile = await DriverProfile.findOne({ user: userId });

  if (!profile) {
    profile = await DriverProfile.create({
      user: userId,
      employeeId: await generateEmployeeId(),
    });
  }

  return formatProfileResponse(profile, user);
};

const updateProfileByUserId = async (user, updateBody) => {
  const userId = user.id || user._id;
  let profile = await DriverProfile.findOne({ user: userId });

  if (!profile) {
    profile = await DriverProfile.create({
      user: userId,
      employeeId: await generateEmployeeId(),
      ...updateBody,
    });
  } else {
    Object.assign(profile, updateBody);
    await profile.save();
  }

  return formatProfileResponse(profile, user);
};

const addDocument = async (user, file, type) => {
  const userId = user.id || user._id;
  const profile = await DriverProfile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver profile not found');
  }

  if (!file?.buffer) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Document file is required');
  }

  const existing = profile.documents.filter((doc) => doc.type === type);
  await Promise.all(existing.map((doc) => cloudinaryService.destroy(doc.filename)));

  const uploaded = await cloudinaryService.uploadBuffer(file.buffer, {
    folder: cloudinaryService.FOLDERS.drivers,
    resourceType: 'auto',
  });

  profile.documents = profile.documents.filter((doc) => doc.type !== type);

  profile.documents.push({
    type,
    filename: uploaded.publicId,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: uploaded.bytes || file.size,
    url: uploaded.url,
    status: 'pending',
  });

  if (type === 'national_id' || type === 'driving_license') {
    profile.idDocumentStatus = 'Pending';
  }

  await profile.save();
  return formatProfileResponse(profile, user);
};

const deleteDocument = async (user, documentId) => {
  const userId = user.id || user._id;
  const profile = await DriverProfile.findOne({ user: userId });

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver profile not found');
  }

  const document = profile.documents.id(documentId);
  if (!document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  await cloudinaryService.destroy(document.filename);

  profile.documents.pull(documentId);
  await profile.save();

  return formatProfileResponse(profile, user);
};

/**
 * Operator list of registered driver accounts with profile and trip status.
 * @returns {Promise<Array>}
 */
const listDriversForOperator = async () => {
  const users = await User.find({ role: 'driver' }).sort('name');
  const userIds = users.map((user) => user._id);
  const profiles = await DriverProfile.find({ user: { $in: userIds } });
  const profileByUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const profileIds = profiles.map((profile) => profile._id);

  const activeTrips = profileIds.length
    ? await Trip.find({
        driverProfile: { $in: profileIds },
        status: { $in: ['starting_soon', 'in_progress', 'ending_soon'] },
      }).select('driverProfile')
    : [];
  const onTrip = new Set(activeTrips.map((trip) => String(trip.driverProfile)));

  return users.map((user) => {
    const profile = profileByUser.get(String(user._id));
    const plain = profile ? profile.toJSON() : {};
    const completeness = getProfileCompleteness(plain);
    const profileId = profile ? String(profile._id || profile.id) : null;
    return {
      id: user.id,
      employeeId: plain.employeeId || '',
      name: user.name,
      email: user.email,
      phone: plain.phone || '',
      address: plain.address || '',
      license: plain.licenseClass || '',
      licenceExpiry: plain.licenceExpiry || null,
      restrictions: plain.restrictions || 'None',
      assignedVehicle: plain.assignedVehicle || '',
      idDocumentStatus: plain.idDocumentStatus || 'Pending',
      status: profileId && onTrip.has(profileId) ? 'On Trip' : 'Available',
      completeness: completeness.percentage,
      profileComplete: completeness.isComplete,
    };
  });
};

module.exports = {
  getOrCreateProfileByUserId,
  updateProfileByUserId,
  addDocument,
  deleteDocument,
  listDriversForOperator,
};

// Support both: require('./driverProfile.service') and { driverProfileService } = require(...)
module.exports.driverProfileService = module.exports;

