const multer = require('multer');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new ApiError(httpStatus.BAD_REQUEST, 'Only JPG, PNG, or WEBP photos are allowed'));
  }
  return cb(null, true);
};

const uploadDamagePhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = uploadDamagePhoto;
