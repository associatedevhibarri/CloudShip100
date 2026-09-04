const httpStatus = require('http-status');
const { v2: cloudinary } = require('cloudinary');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const FOLDERS = {
  drivers: 'cloudship/drivers',
  damageLogs: 'cloudship/damage-logs',
  kycDocuments: 'cloudship/kyc-documents',
};

let configured = false;

const ensureConfigured = () => {
  if (configured) return;

  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
};

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {{ folder: string, resourceType?: string }} options
 * @returns {Promise<{ url: string, publicId: string, bytes: number, resourceType: string }>}
 */
const uploadBuffer = (buffer, { folder, resourceType = 'auto' }) => {
  ensureConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          return reject(
            new ApiError(httpStatus.BAD_GATEWAY, error.message || 'Failed to upload file to Cloudinary')
          );
        }
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          resourceType: result.resource_type,
        });
      }
    );

    stream.end(buffer);
  });
};

/**
 * Destroy a Cloudinary asset by public_id.
 * Folder-prefixed public_ids (e.g. cloudship/drivers/...) are Cloudinary assets;
 * legacy local filenames without a slash are ignored here.
 * @param {string} publicId
 */
const destroy = async (publicId) => {
  if (!publicId || !publicId.includes('/')) return;

  ensureConfigured();

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result === 'not found') {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
  } catch (error) {
    // Best-effort cleanup; do not fail the API request if remote delete fails
  }
};

module.exports = {
  FOLDERS,
  uploadBuffer,
  destroy,
};
