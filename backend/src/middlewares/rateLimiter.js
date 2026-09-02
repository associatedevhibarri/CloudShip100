const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
});

const quoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});

module.exports = {
  authLimiter,
  quoteLimiter,
};
