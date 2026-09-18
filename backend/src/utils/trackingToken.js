const crypto = require('crypto');

const generateTrackingToken = () => crypto.randomBytes(18).toString('base64url');

module.exports = {
  generateTrackingToken,
};
