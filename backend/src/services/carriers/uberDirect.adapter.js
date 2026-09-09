const config = require('../../config/config');
const { requestJson, formUrlEncoded } = require('./http');
const { defaultParcel } = require('./address');
const { phoneFor, structuredAddress, scheduleWindow, scheduleFromQuote } = require('./uberDirect.helpers');
const { createOauthToken } = require('./oauthToken');

const id = 'uber_direct';
const name = 'Uber Direct';

const isConfigured = () => {
  const { clientId, clientSecret, customerId } = config.carriers.uberDirect;
  return Boolean(clientId && clientSecret && customerId);
};

const tokens = createOauthToken(() =>
  formUrlEncoded('https://auth.uber.com/oauth/v2/token', {
    client_id: config.carriers.uberDirect.clientId,
    client_secret: config.carriers.uberDirect.clientSecret,
    grant_type: 'client_credentials',
    scope: 'eats.deliveries',
  })
);

const getToken = () => tokens.get();

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
    courierStatus: data.status || data.status_code || 'pending',
  };
};

const track = async ({ trackingNumber, carrierShipmentId } = {}) => {
  const { customerId } = config.carriers.uberDirect;
  const deliveryId = carrierShipmentId || trackingNumber;
  if (!deliveryId) {
    throw new Error('Uber Direct delivery id required');
  }
  const token = await getToken();
  const data = await requestJson(`https://api.uber.com/v1/customers/${customerId}/deliveries/${encodeURIComponent(deliveryId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return {
    courierStatus: data.status || data.status_code || null,
    trackingNumber: data.uuid || data.id || trackingNumber || deliveryId,
    trackingUrl: data.tracking_url || null,
    events: data.undeliverable_reason ? [{ status: data.status, message: data.undeliverable_reason }] : [],
  };
};

module.exports = {
  id,
  name,
  isConfigured,
  quote,
  book,
  track,
};
