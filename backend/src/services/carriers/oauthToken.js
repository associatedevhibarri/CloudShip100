const createOauthToken = (fetchToken) => {
  let cache = { accessToken: null, expiresAt: 0 };
  let inflight = null;

  const get = async ({ force } = {}) => {
    if (!force && cache.accessToken && Date.now() < cache.expiresAt) {
      return cache.accessToken;
    }
    if (inflight) return inflight;
    inflight = Promise.resolve()
      .then(fetchToken)
      .then((data) => {
        cache = {
          accessToken: data.access_token,
          expiresAt: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000,
        };
        return cache.accessToken;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  const clear = () => {
    cache = { accessToken: null, expiresAt: 0 };
  };

  return { get, clear };
};

const createSerialQueue = () => {
  let chain = Promise.resolve();
  return (fn) => {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
};

const isExpiredToken = (err) => {
  if (!err) return false;
  if (err.status === 401) return true;
  return /invalid.?access.?token|token has expired/i.test(String(err.message || ''));
};

const isRateAuthFailure = (err) => {
  if (isExpiredToken(err)) return true;
  const msg = String((err && err.message) || '');
  if (/authorize your credentials/i.test(msg)) return false;
  return /authenticate your credentials/i.test(msg);
};

module.exports = {
  createOauthToken,
  createSerialQueue,
  isExpiredToken,
  isRateAuthFailure,
};
