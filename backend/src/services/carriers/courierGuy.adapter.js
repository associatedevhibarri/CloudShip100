const config = require('../../config/config');
const { requestJson } = require('./http');
const { parseAddress, defaultParcel } = require('./address');

const id = 'courier_guy';
const name = 'Courier Guy';

const isConfigured = () => Boolean(config.carriers.courierGuy.token);

const tcgAddress = (raw) => {
  const parsed = parseAddress(raw);
  return {
    company: parsed.company || 'CloudShip',
    street_address: parsed.street,
    local_area: parsed.city,
    city: parsed.city,
    country: parsed.countryCode,
    code: parsed.postalCode,
    type: 'business',
  };
};

const tcgPhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('27')) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith('0')) return digits;
  if (digits.length === 9) return `0${digits}`;
  return '0821234567';
};

const tcgContact = (name, phone) => ({
  name: name || 'CloudShip',
  mobile_number: tcgPhone(phone),
  email: 'ops@cloudship.test',
});

const quote = async (shipment) => {
  const parcel = defaultParcel(shipment);
  const data = await requestJson(`${config.carriers.courierGuy.baseUrl}/v2/rates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.carriers.courierGuy.token}`,
      'Content-Type': 'application/json',
    },
    body: {
      collection_address: tcgAddress(shipment.pickup),
      delivery_address: tcgAddress(shipment.dropoff),
      parcels: [
        {
          submitted_length_cm: parcel.lengthCm,
          submitted_width_cm: parcel.widthCm,
          submitted_height_cm: parcel.heightCm,
          submitted_weight_kg: parcel.weightKg,
        },
      ],
      declared_value: shipment.declaredValue || 100,
    },
  });

  const rates = data.rates || (data.result && data.result.rates) || [];
  if (!rates.length) {
    throw new Error('Courier Guy returned no rates');
  }

  const options = rates
    .map((rate) => {
      const serviceLevel = rate.service_level || {};
      const transitDays = Number(
        serviceLevel.delivery_days || rate.delivery_days || rate.estimated_delivery_days
      );
      return {
        partnerPrice: Number(rate.rate),
        currency: (rate.currency || 'ZAR').toUpperCase(),
        serviceName: serviceLevel.name || rate.service_level_code || 'Courier Guy',
        serviceCode: rate.service_level_code || serviceLevel.code,
        partnerQuoteId: rate.rate_id || rate.id || null,
        meta: {
          serviceLevelCode: rate.service_level_code || serviceLevel.code,
          transitDays: Number.isFinite(transitDays) && transitDays > 0 ? transitDays : null,
          deliveryDate: serviceLevel.estimated_delivery_date || rate.estimated_delivery_date || null,
        },
      };
    })
    .filter((row) => Number.isFinite(row.partnerPrice));

  if (!options.length) {
    throw new Error('Courier Guy returned no rates');
  }
  return { options };
};

const book = async (shipment, partnerQuote) => {
  const parcel = defaultParcel(shipment);
  const data = await requestJson(`${config.carriers.courierGuy.baseUrl}/v2/shipments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.carriers.courierGuy.token}`,
      'Content-Type': 'application/json',
    },
    body: {
      collection_address: tcgAddress(shipment.pickup),
      delivery_address: tcgAddress(shipment.dropoff),
      collection_contact: tcgContact(shipment.pickupName || 'CloudShip', shipment.pickupPhone),
      delivery_contact: tcgContact(shipment.dropoffName || shipment.cargo || 'Recipient', shipment.dropoffPhone),
      parcels: [
        {
          submitted_length_cm: parcel.lengthCm,
          submitted_width_cm: parcel.widthCm,
          submitted_height_cm: parcel.heightCm,
          submitted_weight_kg: parcel.weightKg,
        },
      ],
      service_level_code: (partnerQuote.meta && partnerQuote.meta.serviceLevelCode) || partnerQuote.serviceCode,
      declared_value: shipment.declaredValue || 100,
      customer_reference: shipment.cargo || 'CloudShip',
    },
  });

  return {
    carrierShipmentId: String(data.id || data.shipment_id || ''),
    trackingNumber: data.short_tracking_reference || data.tracking_reference || data.id,
    trackingUrl: data.tracking_url || null,
    labelUrl: (data.opt_in_urls && data.opt_in_urls.label) || data.label_url || null,
    courierStatus: data.status || 'collection-assigned',
  };
};

const authHeaders = () => ({
  Authorization: `Bearer ${config.carriers.courierGuy.token}`,
  Accept: 'application/json',
});

const firstShipment = (data) => {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  if (Array.isArray(data.shipments)) return data.shipments[0] || null;
  if (Array.isArray(data.data)) return data.data[0] || null;
  if (data.id || data.shipment_id || data.status) return data;
  return null;
};

const track = async ({ trackingNumber, carrierShipmentId } = {}) => {
  const base = config.carriers.courierGuy.baseUrl.replace(/\/$/, '');
  const headers = authHeaders();
  let row = null;

  if (carrierShipmentId) {
    try {
      row = firstShipment(
        await requestJson(`${base}/v2/tracking/shipments?include_parcels=false&id=${encodeURIComponent(carrierShipmentId)}`, {
          headers,
        })
      );
    } catch (err) {
      try {
        row = firstShipment(await requestJson(`${base}/v2/shipments/${encodeURIComponent(carrierShipmentId)}`, { headers }));
      } catch (inner) {
        row = null;
      }
    }
  }

  if (!row && trackingNumber) {
    const filter = encodeURIComponent(JSON.stringify({ short_tracking_reference: trackingNumber }));
    try {
      row = firstShipment(await requestJson(`${base}/v2/shipments?filter=${filter}`, { headers }));
    } catch (err) {
      row = firstShipment(
        await requestJson(`${base}/v2/shipments?short_tracking_reference=${encodeURIComponent(trackingNumber)}`, { headers })
      );
    }
    if (row && row.id && !row.tracking_events) {
      try {
        const detailed = firstShipment(
          await requestJson(`${base}/v2/tracking/shipments?include_parcels=false&id=${encodeURIComponent(row.id)}`, {
            headers,
          })
        );
        if (detailed) row = { ...row, ...detailed };
      } catch (err) {
        // list payload already has status
      }
    }
  }

  if (!row) {
    throw new Error('Courier Guy tracking not found');
  }

  return {
    courierStatus: row.status || null,
    trackingNumber: row.short_tracking_reference || trackingNumber || null,
    trackingUrl: row.tracking_url || null,
    events: row.tracking_events || [],
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
