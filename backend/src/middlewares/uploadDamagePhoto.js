const path = require('path');
const fs = require('fs');
const multer = require('multer');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const uploadRoot = path.join(__dirname, '../../uploads/damage-logs');

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

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
