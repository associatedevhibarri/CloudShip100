const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const requireDriver = (req, res, next) => {
  if (req.user.role !== 'driver') {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Driver access only'));
  }
  return next();
};

module.exports = requireDriver;
