const config = require('../../config/config');
const { requestJson, formUrlEncoded } = require('./http');
const { defaultParcel } = require('./address');
const { phoneFor, structuredAddress, scheduleWindow, scheduleFromQuote } = require('./uberDirect.helpers');

const id = 'uber_direct';
const name = 'Uber Direct';

let tokenCache = { accessToken: null, expiresAt: 0 };

const isConfigured = () => {
  const { clientId, clientSecret, customerId } = config.carriers.uberDirect;
  return Boolean(clientId && clientSecret && customerId);
};

const getToken = async () => {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }
  const data = await formUrlEncoded('https://auth.uber.com/oauth/v2/token', {
    client_id: config.carriers.uberDirect.clientId,
    client_secret: config.carriers.uberDirect.clientSecret,
    grant_type: 'client_credentials',
    scope: 'eats.deliveries',
  });
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return tokenCache.accessToken;
};

const quote = async (shipment) => {
  const { customerId } = config.carriers.uberDirect;
  const token = await getToken();
  const schedule = scheduleWindow(shipment);
  const body = {
    pickup_address: structuredAddress(shipment.pickup),
    dropoff_address: structuredAddress(shipment.dropoff),
    ...schedule,
  };

  const data = await requestJson(`https://api.uber.com/v1/customers/${customerId}/delivery_quotes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  return {
    partnerPrice: Number(data.fee) / 100,
    currency: (data.currency_type || data.currency || 'ZAR').toUpperCase(),
    serviceName: 'Uber Direct',
    serviceCode: 'uber_direct',
    partnerQuoteId: data.id,
    expiresAt: data.expires,
    meta: {
      duration: data.duration,
      pickupDuration: data.pickup_duration,
      pickupReadyDt: schedule.pickup_ready_dt || null,
      pickupDeadlineDt: schedule.pickup_deadline_dt || null,
      dropoffReadyDt: schedule.dropoff_ready_dt || null,
      dropoffDeadlineDt: schedule.dropoff_deadline_dt || null,
    },
  };
};

const book = async (shipment, partnerQuote) => {
  const { customerId } = config.carriers.uberDirect;
  const token = await getToken();
  const parcel = defaultParcel(shipment);
  const data = await requestJson(`https://api.uber.com/v1/customers/${customerId}/deliveries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: {
      quote_id: partnerQuote.partnerQuoteId,
      pickup_address: structuredAddress(shipment.pickup),
      pickup_name: shipment.pickupName || 'CloudShip pickup',
      pickup_phone_number: phoneFor(shipment.pickupPhone, shipment.pickup),
      dropoff_address: structuredAddress(shipment.dropoff),
      dropoff_name: shipment.dropoffName || shipment.cargo || 'Recipient',
      dropoff_phone_number: phoneFor(shipment.dropoffPhone, shipment.dropoff),
      manifest_items: [
        {
          name: shipment.cargo || 'Parcel',
          quantity: 1,
          size: parcel.weightKg <= 2 ? 'small' : parcel.weightKg <= 10 ? 'medium' : 'large',
          weight: Math.round(parcel.weightKg * 1000),
          dimensions: {
            length: parcel.lengthCm,
            height: parcel.heightCm,
            depth: parcel.widthCm,
          },
        },
      ],
      ...scheduleFromQuote(shipment, partnerQuote),
    },
  });

  return {
    carrierShipmentId: data.id,
    trackingNumber: data.uuid || data.id,
    trackingUrl: data.tracking_url || null,
    labelUrl: null,
  };
};

module.exports = {
  id,
  name,
  isConfigured,
  quote,
  book,
};
