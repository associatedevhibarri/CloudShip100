const httpStatus = require('http-status');
const fs = require('fs');
const path = require('path');
const { DriverProfile } = require('../models');
const ApiError = require('../utils/ApiError');
const { getProfileCompleteness } = require('../utils/driverProfileCompleteness');

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
  let profile = await DriverProfile.findOne({ user: user.id });

  if (!profile) {
    profile = await DriverProfile.create({
      user: user.id,
      employeeId: await generateEmployeeId(),
    });
  }

  return formatProfileResponse(profile, user);
};

const updateProfileByUserId = async (user, updateBody) => {
  let profile = await DriverProfile.findOne({ user: user.id });

  if (!profile) {
    profile = await DriverProfile.create({
      user: user.id,
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
  const profile = await DriverProfile.findOne({ user: user.id });

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver profile not found');
  }

  profile.documents = profile.documents.filter((doc) => doc.type !== type);

  profile.documents.push({
    type,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `/v1/uploads/drivers/${file.filename}`,
    status: 'pending',
  });

  if (type === 'national_id' || type === 'driving_license') {
    profile.idDocumentStatus = 'Pending';
  }

  await profile.save();
  return formatProfileResponse(profile, user);
};

const deleteDocument = async (user, documentId) => {
  const profile = await DriverProfile.findOne({ user: user.id });

  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Driver profile not found');
  }

  const document = profile.documents.id(documentId);
  if (!document) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Document not found');
  }

  const filePath = path.join(__dirname, '../../uploads/drivers', document.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

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
