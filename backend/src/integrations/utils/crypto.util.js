const crypto = require('crypto');
const config = require('../../config/config');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

const deriveKey = () => {
  const secret = config.ecommerce.credentialsSecret || config.jwt.secret;
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Encrypt JSON-serializable credentials for StoreConnection storage.
 * @param {Object} plain
 * @returns {string} iv:tag:ciphertext (hex)
 */
const encryptCredentials = (plain) => {
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(plain);
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
};

/**
 * @param {string} blob
 * @returns {Object}
 */
const decryptCredentials = (blob) => {
  if (!blob || typeof blob !== 'string') {
    throw new Error('Missing credentials blob');
  }
  const [ivHex, tagHex, dataHex] = blob.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid credentials blob');
  }
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
};

/**
 * Constant-time HMAC compare (hex digests).
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
const safeEqualHex = (a, b) => {
  try {
    const ba = Buffer.from(String(a), 'hex');
    const bb = Buffer.from(String(b), 'hex');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch (e) {
    return false;
  }
};

/**
 * Constant-time string compare for base64 / plain HMAC headers.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
const safeEqualString = (a, b) => {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
};

const hmacSha256Hex = (secret, payload) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

const hmacSha256Base64 = (secret, payload) =>
  crypto.createHmac('sha256', secret).update(payload).digest('base64');

const randomApiKey = (prefix = 'cs') =>
  `${prefix}_${crypto.randomBytes(24).toString('hex')}`;

module.exports = {
  encryptCredentials,
  decryptCredentials,
  safeEqualHex,
  safeEqualString,
  hmacSha256Hex,
  hmacSha256Base64,
  randomApiKey,
};
