const config = require('../../config/config');
const { requestJson, formUrlEncoded } = require('./http');
const { parseAddress, defaultParcel } = require('./address');

const id = 'dsv';
const name = 'DSV';

let tokenCache = { accessToken: null, expiresAt: 0 };

const isConfigured = () =>
  Boolean(config.carriers.dsv.subscriptionKey && (config.carriers.dsv.clientId || config.carriers.dsv.serviceAuth));

const headers = (token) => {
  const h = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'DSV-Subscription-Key': config.carriers.dsv.subscriptionKey,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  if (config.carriers.dsv.serviceAuth) h['DSV-Service-Auth'] = config.carriers.dsv.serviceAuth;
  if (config.carriers.dsv.pat) h['x-pat'] = config.carriers.dsv.pat;
  return h;
};

const getToken = async () => {
  if (!config.carriers.dsv.clientId || !config.carriers.dsv.clientSecret) {
    return null;
  }
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }
  const data = await formUrlEncoded(`${config.carriers.dsv.baseUrl}/oauth/v1/token`, {
    grant_type: 'client_credentials',
    client_id: config.carriers.dsv.clientId,
    client_secret: config.carriers.dsv.clientSecret,
  });
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000,
  };
  return tokenCache.accessToken;
};

const quote = async (shipment) => {
  const token = await getToken();
  const origin = parseAddress(shipment.pickup);
  const dest = parseAddress(shipment.dropoff);
  const parcel = defaultParcel(shipment);
  const data = await requestJson(`${config.carriers.dsv.baseUrl}/xpress/rate/v1/quotes`, {
    method: 'POST',
    headers: headers(token),
    body: {
      origin: {
        countryCode: origin.countryCode,
        postalCode: origin.postalCode,
        city: origin.city,
      },
      destination: {
        countryCode: dest.countryCode,
        postalCode: dest.postalCode,
        city: dest.city,
      },
      packages: [
        {
          weight: parcel.weightKg,
          length: parcel.lengthCm,
          width: parcel.widthCm,
          height: parcel.heightCm,
        },
      ],
    },
  });

  const quotes = data.quotes || data.rates || data.items || (Array.isArray(data) ? data : []);
  if (!quotes.length && data.totalPrice == null && data.price == null) {
    throw new Error('DSV returned no quotes');
  }
  const rows = quotes.length ? quotes : [data];
  const options = rows
    .map((first) => {
      const price = Number(first.totalPrice || first.price || first.amount || first.rate);
      const transitDays = Number(first.transitDays || first.transit_days || first.transitTime);
      return {
        partnerPrice: price,
        currency: (first.currency || data.currency || 'ZAR').toUpperCase(),
        serviceName: first.serviceName || first.productName || 'DSV XPress',
        serviceCode: first.serviceCode || first.productCode || 'xpress',
        partnerQuoteId: first.quoteId || first.id || null,
        meta: {
          quoteId: first.quoteId || first.id,
          transitDays: Number.isFinite(transitDays) ? transitDays : null,
          deliveryDate: first.deliveryDate || first.eta || null,
        },
      };
    })
    .filter((row) => Number.isFinite(row.partnerPrice));
  if (!options.length) {
    throw new Error('DSV quote missing a price');
  }
  return { options };
};

const book = async (shipment, partnerQuote) => {
  const token = await getToken();
  const origin = parseAddress(shipment.pickup);
  const dest = parseAddress(shipment.dropoff);
  const parcel = defaultParcel(shipment);
  const data = await requestJson(`${config.carriers.dsv.baseUrl}/booking/v2/bookings`, {
    method: 'POST',
    headers: headers(token),
    body: {
      autobook: true,
      product: partnerQuote.serviceCode,
      quoteId: (partnerQuote.meta && partnerQuote.meta.quoteId) || partnerQuote.partnerQuoteId,
      origin: {
        countryCode: origin.countryCode,
        postalCode: origin.postalCode,
        city: origin.city,
        addressLine: origin.street,
      },
      destination: {
        countryCode: dest.countryCode,
        postalCode: dest.postalCode,
        city: dest.city,
        addressLine: dest.street,
      },
      packages: [
        {
          weight: parcel.weightKg,
          length: parcel.lengthCm,
          width: parcel.widthCm,
          height: parcel.heightCm,
        },
      ],
    },
  });

  return {
    carrierShipmentId: data.bookingId || data.id || data.shipmentId,
    trackingNumber: data.trackingId || data.awb || data.bookingId,
    trackingUrl: data.trackingUrl || null,
    labelUrl: data.labelUrl || null,
  };
};

module.exports = {
  id,
  name,
  isConfigured,
  quote,
  book,
};
