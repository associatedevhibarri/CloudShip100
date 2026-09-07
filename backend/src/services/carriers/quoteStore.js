const crypto = require('crypto');

const store = new Map();
const TTL_MS = 15 * 60 * 1000;

const prune = () => {
  const now = Date.now();
  store.forEach((value, key) => {
    if (value.expiresAt <= now) store.delete(key);
  });
};

const put = (payload) => {
  prune();
  const quoteId = `csq_${crypto.randomBytes(8).toString('hex')}`;
  const expiresAt = Date.now() + TTL_MS;
  store.set(quoteId, { ...payload, expiresAt });
  return { quoteId, expiresAt: new Date(expiresAt).toISOString() };
};

const get = (quoteId) => {
  prune();
  const row = store.get(quoteId);
  if (!row) return null;
  return row;
};

module.exports = {
  put,
  get,
};
