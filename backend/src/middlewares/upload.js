const multer = require('multer');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new ApiError(httpStatus.BAD_REQUEST, 'Only JPG, PNG, WEBP, or PDF files are allowed'));
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
