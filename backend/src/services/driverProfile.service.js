const httpStatus = require('http-status');
const { DriverProfile } = require('../models');
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

module.exports = {
  getOrCreateProfileByUserId,
  updateProfileByUserId,
  addDocument,
  deleteDocument,
};

// Support both: require('./driverProfile.service') and { driverProfileService } = require(...)
module.exports.driverProfileService = module.exports;

