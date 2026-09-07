/**
 * CloudShip universal embed for Lovable / custom stores.
 * Usage:
 *   <script src="https://YOUR_API/v1/public/cloudship.js"></script>
 *   CloudShip.init({ apiBase, apiKey, connectionId?, webhookSecret? })
 *   const rates = await CloudShip.quote({ pickup, dropoff, weightKg })
 *   const order = await CloudShip.createShipment({ ...order, quoteId })
 */
(function (root) {
  const state = { apiBase: '', apiKey: '', connectionId: '', webhookSecret: '' };

  async function hmacHex(secret, body) {
    if (!secret || !root.crypto || !root.crypto.subtle) return null;
    const enc = new TextEncoder();
    const key = await root.crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await root.crypto.subtle.sign('HMAC', key, enc.encode(body));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function request(path, payload) {
    const body = JSON.stringify(payload || {});
    const headers = {
      'Content-Type': 'application/json',
      'X-CloudShip-Key': state.apiKey,
    };
    if (state.connectionId) headers['X-CloudShip-Connection-Id'] = state.connectionId;
    const sig = await hmacHex(state.webhookSecret, body);
    if (sig) headers['X-CloudShip-Signature'] = sig;
    const res = await fetch(`${state.apiBase.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers,
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error((data && data.message) || res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  root.CloudShip = {
    init(opts) {
      state.apiBase = opts.apiBase || '';
      state.apiKey = opts.apiKey || '';
      state.connectionId = opts.connectionId || '';
      state.webhookSecret = opts.webhookSecret || '';
      return root.CloudShip;
    },
    quote(payload) {
      const path = state.connectionId
        ? `/v1/webhooks/lovable/rates?connectionId=${encodeURIComponent(state.connectionId)}`
        : '/v1/webhooks/lovable/rates';
      return request(path, payload);
    },
    createShipment(payload) {
      return request('/v1/webhooks/lovable/orders', payload);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
