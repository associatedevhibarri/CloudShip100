const config = require('../../config/config');
const { requestJson, formUrlEncoded } = require('./http');
const { parseAddress } = require('./address');
const { pickupIsoDate } = require('./speed');
const { packageLineItem } = require('./fedexPackage');

const id = 'fedex';
const name = 'FedEx';

let tokenCache = { accessToken: null, expiresAt: 0 };

const isConfigured = () =>
  Boolean(config.carriers.fedex.clientId && config.carriers.fedex.clientSecret && config.carriers.fedex.accountNumber);

const getToken = async ({ force } = {}) => {
  if (!force && tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }
  const data = await formUrlEncoded(`${config.carriers.fedex.baseUrl}/oauth/token`, {
    grant_type: 'client_credentials',
    client_id: config.carriers.fedex.clientId,
    client_secret: config.carriers.fedex.clientSecret,
  });
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000,
  };
  return tokenCache.accessToken;
};

const fedexHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'x-locale': 'en_US',
  'x-customer-transaction-id': `cloudship-${Date.now()}`,
});

const fedexJson = async (url, options, retried = false) => {
  try {
    const token = await getToken({ force: retried });
    return await requestJson(url, {
      ...options,
      headers: { ...fedexHeaders(token), ...(options.headers || {}) },
    });
  } catch (err) {
    if (!retried && err.status === 401) {
      tokenCache = { accessToken: null, expiresAt: 0 };
      return fedexJson(url, options, true);
    }
    throw err;
  }
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

const fedexPhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return '9015551212';
};

const quote = async (shipment) => {
  const data = await fedexJson(`${config.carriers.fedex.baseUrl}/rate/v1/rates/quotes`, {
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
  });

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
  const data = await fedexJson(`${config.carriers.fedex.baseUrl}/ship/v1/shipments`, {
    method: 'POST',
    body: {
      labelResponseOptions: 'URL_ONLY',
      accountNumber,
      requestedShipment: {
        shipper: {
          contact: {
            personName: shipment.pickupName || 'CloudShip',
            phoneNumber: fedexPhone(shipment.pickupPhone),
            companyName: 'CloudShip',
          },
          address: fedexAddress(shipment.pickup),
        },
        recipients: [
          {
            contact: {
              personName: shipment.dropoffName || 'Recipient',
              phoneNumber: fedexPhone(shipment.dropoffPhone),
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
      },
    },
  });

  const shipments = data.output && data.output.transactionShipments;
  const shipmentResult = (shipments && shipments[0]) || {};
  const pieces = shipmentResult.pieceResponses;
  const piece = (pieces && pieces[0]) || {};
  const docs = piece.packageDocuments;
  const label = docs && docs[0];
  return {
    carrierShipmentId: shipmentResult.masterTrackingNumber || piece.trackingNumber,
    trackingNumber: shipmentResult.masterTrackingNumber || piece.trackingNumber,
    trackingUrl: null,
    labelUrl: (label && label.url) || null,
  };
};

module.exports = {
  id,
  name,
  isConfigured,
  quote,
  book,
};
