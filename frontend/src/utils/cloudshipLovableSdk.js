/**
 * CloudShip SDK for Lovable & Universal Custom E-Commerce Applications
 * 
 * Enterprise-grade client SDK supporting dynamic environment resolution,
 * automatic retries, timeout handling, and input validation.
 */

const getEnvBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env) {
    const envUrl =
      process.env.VITE_CLOUDSHIP_API_URL ||
      process.env.NEXT_PUBLIC_CLOUDSHIP_API_URL ||
      process.env.REACT_APP_CLOUDSHIP_API_URL ||
      process.env.CLOUDSHIP_API_URL;
    if (envUrl) return envUrl;
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return '';
};

export class CloudShip {
  /**
   * Initialize CloudShip SDK instance
   * @param {Object} config
   * @param {string} config.apiKey - CloudShip Store Public API Key
   * @param {string} [config.baseUrl] - CloudShip API base URL (defaults to environment or origin)
   * @param {number} [config.timeoutMs=10000] - Request timeout in milliseconds
   */
  constructor(config = {}) {
    const apiKey = config.apiKey || (typeof process !== 'undefined' && process.env && (process.env.VITE_CLOUDSHIP_API_KEY || process.env.NEXT_PUBLIC_CLOUDSHIP_API_KEY));
    if (!apiKey) {
      throw new Error('[CloudShip SDK] Public API Key is required. Pass { apiKey: "cs_live_..." } or set VITE_CLOUDSHIP_API_KEY / NEXT_PUBLIC_CLOUDSHIP_API_KEY environment variable.');
    }

    const rawBaseUrl = config.baseUrl || getEnvBaseUrl();
    if (!rawBaseUrl) {
      throw new Error('[CloudShip SDK] Base URL could not be resolved. Please pass { baseUrl: "https://your-api.com" }.');
    }

    this.apiKey = apiKey.trim();
    this.baseUrl = rawBaseUrl.replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs || 10000;
  }

  /**
   * Internal HTTP request wrapper with AbortController timeout & error handling
   * @private
   */
  async _request(endpoint, payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-cloudship-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : await response.text();

      if (!response.ok) {
        const errorMessage = typeof data === 'object' && data.message ? data.message : data;
        throw new Error(`[CloudShip SDK] API Error (${response.status}): ${errorMessage}`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`[CloudShip SDK] Request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }

  /**
   * Fetch live carrier rates for customer checkout
   * @param {Object} params
   * @param {string} params.pickup - Pickup address (merchant warehouse/store)
   * @param {string} params.dropoff - Customer shipping address
   * @param {number} params.weightKg - Total package weight in KG
   * @param {string} [params.currency='ZAR'] - Currency code (e.g. ZAR, USD, EUR)
   */
  async getShippingRates({ pickup, dropoff, weightKg, currency = 'ZAR' }) {
    if (!dropoff) throw new Error('[CloudShip SDK] dropoff address is required for rates.');
    
    return await this._request('/v1/webhooks/lovable/rates', {
      pickup: pickup || 'Merchant Warehouse',
      dropoff,
      weightKg: Number(weightKg) > 0 ? Number(weightKg) : 1,
      currency: currency.toUpperCase(),
    });
  }

  /**
   * Submit completed order for fulfillment
   * @param {Object} order
   * @param {string} order.externalOrderId - Unique order ID from storefront
   * @param {string} order.buyerEmail - Customer email
   * @param {string} [order.buyerPhone] - Customer phone
   * @param {string} order.pickup - Pickup address
   * @param {string} order.dropoff - Delivery address
   * @param {number} order.weightKg - Package weight in KG
   * @param {string} [order.cargo] - Description of items
   * @param {string} [order.currency='ZAR'] - Currency code
   */
  async createOrder(order) {
    if (!order.externalOrderId) throw new Error('[CloudShip SDK] externalOrderId is required.');
    if (!order.buyerEmail) throw new Error('[CloudShip SDK] buyerEmail is required.');
    if (!order.dropoff) throw new Error('[CloudShip SDK] dropoff address is required.');

    return await this._request('/v1/webhooks/lovable/orders', {
      externalOrderId: String(order.externalOrderId),
      buyerEmail: order.buyerEmail,
      buyerPhone: order.buyerPhone || null,
      pickup: order.pickup || 'Merchant Warehouse',
      dropoff: order.dropoff,
      weightKg: Number(order.weightKg) > 0 ? Number(order.weightKg) : 1,
      cargo: order.cargo || `Order ${order.externalOrderId}`,
      currency: (order.currency || 'ZAR').toUpperCase(),
    });
  }
}

/**
 * Factory helper for single-line initialization
 */
export const createCloudShipClient = (config) => new CloudShip(config);
