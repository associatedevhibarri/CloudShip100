/* global fetch */

const requestJson = async (url, options = {}) => {
  const method = options.method || 'GET';
  const headers = options.headers || {};
  const timeoutMs = options.timeoutMs || 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        data = { raw: text, parseError: parseErr.message };
      }
    }
    if (!response.ok) {
      let message = `HTTP ${response.status} ${response.statusText}`;
      if (data) {
        const nested = data.errors && data.errors[0];
        const params = nested && nested.parameterList;
        const metadata = data.metadata && typeof data.metadata === 'object' ? data.metadata : null;
        if (params && params.length) {
          message = params.map((row) => row.value || row.key).filter(Boolean).join('; ');
        } else {
          message =
            (nested && (nested.message || nested.code)) ||
            data.message ||
            data.error ||
            data.title ||
            data.detail ||
            data.raw ||
            message;
        }
        if (metadata) {
          const bits = Object.entries(metadata)
            .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
            .filter(Boolean);
          if (bits.length) message = `${message} (${bits.join('; ')})`;
        }
      }
      const error = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      error.status = response.status;
      error.body = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
};

const formUrlEncoded = async (url, fields, options = {}) => {
  const headers = options.headers || {};
  const timeoutMs = options.timeoutMs || 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
      body: new URLSearchParams(fields).toString(),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error_description || data.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.body = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
};

module.exports = {
  requestJson,
  formUrlEncoded,
};
