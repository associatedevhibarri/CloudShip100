const config = require('../../config/config');
const { requestJson, formUrlEncoded } = require('./http');
const { parseAddress, defaultParcel } = require('./address');
const { pickupIsoDate } = require('./speed');
const { packageLineItem } = require('./fedexPackage');
const { createOauthToken, createSerialQueue, isRateAuthFailure } = require('./oauthToken');

const id = 'fedex';
const name = 'FedEx';

const isConfigured = () =>
  Boolean(config.carriers.fedex.clientId && config.carriers.fedex.clientSecret && config.carriers.fedex.accountNumber);

const tokens = createOauthToken(() =>
  formUrlEncoded(`${config.carriers.fedex.baseUrl}/oauth/token`, {
    grant_type: 'client_credentials',
    client_id: config.carriers.fedex.clientId,
    client_secret: config.carriers.fedex.clientSecret,
  })
);
const enqueue = createSerialQueue();

const fedexHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'x-locale': 'en_US',
  'x-customer-transaction-id': `cloudship-${Date.now()}`,
});

const fedexJson = (url, options, { enqueue: useQueue = true } = {}) => {
  const run = async () => {
    const call = async (force) => {
      const token = await tokens.get({ force });
      return requestJson(url, {
        ...options,
        headers: { ...fedexHeaders(token), ...(options.headers || {}) },
      });
    };
    try {
      return await call(false);
    } catch (err) {
      if (isRateAuthFailure(err)) {
        tokens.clear();
        return call(true);
      }
      throw err;
    }
  };
  return useQueue ? enqueue(run) : run();
};

const fedexAddress = (raw) => {
  const parsed = parseAddress(raw);
  const address = {
    streetLines: [parsed.street],
    city: parsed.city,
    postalCode: parsed.postalCode,
    countryCode: parsed.countryCode,
  };
  if (parsed.state) address.stateOrProvinceCode = parsed.state;
  return address;
};

const FEDEX_PHONE = {
  ZA: '0215551234',
  US: '9015551212',
  GB: '2071838750',
};

const fedexPhone = (raw, countryCode) => {
  const digits = String(raw || '').replace(/\D/g, '');
  const country = String(countryCode || 'US').toUpperCase();
  if (country === 'US' || country === 'CA') {
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    if (digits.length === 10 && digits[0] !== '0') return digits;
    return FEDEX_PHONE.US;
  }
  if (digits.length >= 10) return digits.slice(-10);
  return FEDEX_PHONE[country] || FEDEX_PHONE.US;
};

const internationalCustoms = (shipment, origin, dest, accountNumber) => {
  if (origin.countryCode === dest.countryCode) return {};
  const parcel = defaultParcel(shipment);
  const value = Math.max(1, Number(shipment.declaredValue) || Number(shipment.value) || 50);
  const currency = (shipment.currency || 'USD').toUpperCase() === 'ZAR' ? 'USD' : (shipment.currency || 'USD').toUpperCase();
  return {
    customsClearanceDetail: {
      dutiesPayment: {
        paymentType: 'SENDER',
        payor: { responsibleParty: { accountNumber } },
      },
      isDocumentOnly: false,
      commodities: [
        {
          description: String(shipment.cargo || 'Parcel').slice(0, 30),
          countryOfManufacture: origin.countryCode,
          numberOfPieces: 1,
          quantity: 1,
          quantityUnits: 'PCS',
          unitPrice: { amount: value, currency },
          customsValue: { amount: value, currency },
          weight: { units: 'KG', value: parcel.weightKg },
        },
      ],
    },
  };
};

const quote = async (shipment) => {
  const payload = {
    method: 'POST',
    body: {
      accountNumber: { value: config.carriers.fedex.accountNumber },
      requestedShipment: {
        shipDatestamp: pickupIsoDate(shipment),
        shipper: { address: fedexAddress(shipment.pickup) },
        recipient: { address: fedexAddress(shipment.dropoff) },
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        rateRequestType: ['ACCOUNT', 'LIST'],
        requestedPackageLineItems: [packageLineItem(shipment)],
      },
    },
  };
  let data;
  try {
    data = await fedexJson(`${config.carriers.fedex.baseUrl}/rate/v1/rates/quotes`, payload);
  } catch (err) {
    if (!isRateAuthFailure(err)) throw err;
    tokens.clear();
    data = await fedexJson(`${config.carriers.fedex.baseUrl}/rate/v1/rates/quotes`, payload);
  }

  const details = (data.output && data.output.rateReplyDetails) || [];
  if (!details.length) {
    throw new Error('FedEx returned no rates');
  }
  const options = details
    .map((detail) => {
      const shipmentRate = detail.ratedShipmentDetails && detail.ratedShipmentDetails[0];
      const amount = shipmentRate && (shipmentRate.totalNetCharge || shipmentRate.totalNetFedExCharge);
      const operational = detail.operationalDetail || {};
      const commit = (detail.commit && detail.commit.dateDetail) || {};
      return {
        partnerPrice: Number(amount),
        currency: (shipmentRate && shipmentRate.currency) || 'USD',
        serviceName: detail.serviceName || detail.serviceType,
        serviceCode: detail.serviceType,
        partnerQuoteId: detail.serviceType,
        meta: {
          serviceType: detail.serviceType,
          transitTime: operational.transitTime || null,
          deliveryDate: commit.dayFormat || operational.deliveryDate || null,
        },
      };
    })
    .filter((row) => Number.isFinite(row.partnerPrice));
  if (!options.length) {
    throw new Error('FedEx returned rates without prices');
  }
  return { options };
};

const book = async (shipment, partnerQuote) => {
  const accountNumber = { value: config.carriers.fedex.accountNumber };
  const origin = parseAddress(shipment.pickup);
  const dest = parseAddress(shipment.dropoff);
  const data = await fedexJson(`${config.carriers.fedex.baseUrl}/ship/v1/shipments`, {
    method: 'POST',
    body: {
      labelResponseOptions: 'URL_ONLY',
      accountNumber,
      requestedShipment: {
        shipper: {
          contact: {
            personName: shipment.pickupName || 'CloudShip',
            phoneNumber: fedexPhone(shipment.pickupPhone, origin.countryCode),
            companyName: 'CloudShip',
          },
          address: fedexAddress(shipment.pickup),
        },
        recipients: [
          {
            contact: {
              personName: shipment.dropoffName || 'Recipient',
              phoneNumber: fedexPhone(shipment.dropoffPhone, dest.countryCode),
            },
            address: fedexAddress(shipment.dropoff),
          },
        ],
        shipDatestamp: pickupIsoDate(shipment),
        serviceType: (partnerQuote.meta && partnerQuote.meta.serviceType) || partnerQuote.serviceCode,
        packagingType: 'YOUR_PACKAGING',
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        shippingChargesPayment: {
          paymentType: 'SENDER',
          payor: { responsibleParty: { accountNumber } },
        },
        labelSpecification: { imageType: 'PDF', labelStockType: 'PAPER_85X11_TOP_HALF_LABEL' },
        requestedPackageLineItems: [packageLineItem(shipment)],
        ...internationalCustoms(shipment, origin, dest, accountNumber),
      },
    },
  });

  const shipments = data.output && data.output.transactionShipments;
  const shipmentResult = (shipments && shipments[0]) || {};
  const pieces = shipmentResult.pieceResponses;
  const piece = (pieces && pieces[0]) || {};
  const docs = piece.packageDocuments;
  const label = docs && docs[0];
  const trackingNumber = shipmentResult.masterTrackingNumber || piece.trackingNumber;
  return {
    carrierShipmentId: trackingNumber,
    trackingNumber,
    trackingUrl: trackingNumber ? `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}` : null,
    labelUrl: (label && label.url) || null,
    courierStatus: 'label-created',
  };
};

const firstTrackResult = (data) => {
  const complete = data && data.output && data.output.completeTrackResults;
  const first = complete && complete[0];
  const results = first && first.trackResults;
  return (results && results[0]) || null;
};

const track = async ({ trackingNumber, carrierShipmentId } = {}) => {
  const number = trackingNumber || carrierShipmentId;
  if (!number) {
    throw new Error('FedEx tracking number required');
  }
  const data = await fedexJson(
    `${config.carriers.fedex.baseUrl}/track/v1/trackingnumbers`,
    {
      method: 'POST',
      body: {
        includeDetailedScans: true,
        trackingInfo: [{ trackingNumberInfo: { trackingNumber: String(number) } }],
      },
    },
    { enqueue: false }
  );
  const result = firstTrackResult(data);
  if (!result) {
    throw new Error('FedEx tracking not found');
  }
  const latest = result.latestStatusDetail || {};
  const courierStatus = latest.code || latest.derivedCode || latest.statusByLocale || latest.description || 'label-created';
  const scans = result.scanEvents || [];
  return {
    courierStatus: String(courierStatus),
    trackingNumber: (result.trackingNumberInfo && result.trackingNumberInfo.trackingNumber) || number,
    trackingUrl: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(number)}`,
    events: scans,
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
