const config = require('../../config/config');
const { requestJson } = require('./http');
const { parseAddress, defaultParcel } = require('./address');
const { pickupIsoDate } = require('./speed');

const id = 'dhl_express';
const name = 'DHL Express';

const isConfigured = () =>
  Boolean(config.carriers.dhlExpress.apiKey && config.carriers.dhlExpress.apiSecret && config.carriers.dhlExpress.account);

const authHeader = () => {
  const token = Buffer.from(`${config.carriers.dhlExpress.apiKey}:${config.carriers.dhlExpress.apiSecret}`).toString(
    'base64'
  );
  return `Basic ${token}`;
};

const shippingDate = (shipment) => pickupIsoDate(shipment);

const quote = async (shipment) => {
  const origin = parseAddress(shipment.pickup);
  const dest = parseAddress(shipment.dropoff);
  const parcel = defaultParcel(shipment);
  const params = new URLSearchParams({
    accountNumber: config.carriers.dhlExpress.account,
    originCountryCode: origin.countryCode,
    originPostalCode: origin.postalCode,
    originCityName: origin.city,
    destinationCountryCode: dest.countryCode,
    destinationPostalCode: dest.postalCode,
    destinationCityName: dest.city,
    weight: String(parcel.weightKg),
    length: String(parcel.lengthCm),
    width: String(parcel.widthCm),
    height: String(parcel.heightCm),
    plannedShippingDate: shippingDate(shipment),
    isCustomsDeclarable: origin.countryCode === dest.countryCode ? 'false' : 'true',
    unitOfMeasurement: 'metric',
  });

  const data = await requestJson(`${config.carriers.dhlExpress.baseUrl}/rates?${params.toString()}`, {
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
    },
  });

  const products = data.products || [];
  if (!products.length) {
    throw new Error('DHL returned no products');
  }
  const options = products
    .map((product) => {
      const totals = product.totalPrice || [];
      const prices = product.price || [];
      const withCurrency = totals.find((p) => p.priceCurrency);
      const firstTotal = withCurrency || totals[0] || prices[0] || {};
      const caps = product.deliveryCapabilities || {};
      const transitDays = Number(caps.totalTransitDays || product.totalTransitDays);
      return {
        partnerPrice: Number(firstTotal.price),
        currency: firstTotal.priceCurrency || 'USD',
        serviceName: product.productName || 'DHL Express',
        serviceCode: product.productCode,
        partnerQuoteId: product.productCode,
        meta: {
          productCode: product.productCode,
          transitDays: Number.isFinite(transitDays) ? transitDays : null,
          deliveryDate: caps.estimatedDeliveryDateAndTime || caps.deliveryDateAndTime || null,
        },
      };
    })
    .filter((row) => Number.isFinite(row.partnerPrice));
  if (!options.length) {
    throw new Error('DHL returned products without prices');
  }
  return { options };
};

const book = async (shipment, partnerQuote) => {
  const origin = parseAddress(shipment.pickup);
  const dest = parseAddress(shipment.dropoff);
  const parcel = defaultParcel(shipment);
  const data = await requestJson(`${config.carriers.dhlExpress.baseUrl}/shipments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: {
      plannedShippingDateAndTime: `${shippingDate(shipment)}T12:00:00 GMT+02:00`,
      pickup: { isRequested: false },
      productCode: (partnerQuote.meta && partnerQuote.meta.productCode) || partnerQuote.serviceCode,
      accounts: [{ typeCode: 'shipper', number: config.carriers.dhlExpress.account }],
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: origin.postalCode,
            cityName: origin.city,
            countryCode: origin.countryCode,
            addressLine1: origin.street,
          },
          contactInformation: {
            phone: shipment.pickupPhone || '0000000000',
            companyName: 'CloudShip',
            fullName: shipment.pickupName || 'CloudShip',
          },
        },
        receiverDetails: {
          postalAddress: {
            postalCode: dest.postalCode,
            cityName: dest.city,
            countryCode: dest.countryCode,
            addressLine1: dest.street,
          },
          contactInformation: {
            phone: shipment.dropoffPhone || '0000000000',
            companyName: shipment.dropoffName || 'Recipient',
            fullName: shipment.dropoffName || 'Recipient',
          },
        },
      },
      content: {
        packages: [
          {
            weight: parcel.weightKg,
            dimensions: {
              length: parcel.lengthCm,
              width: parcel.widthCm,
              height: parcel.heightCm,
            },
          },
        ],
        isCustomsDeclarable: origin.countryCode !== dest.countryCode,
        description: shipment.cargo || 'Parcel',
        incoterm: 'DAP',
        unitOfMeasurement: 'metric',
      },
    },
  });

  const piece = (data.packages && data.packages[0]) || (data.documents && data.documents[0]) || {};
  return {
    carrierShipmentId: data.shipmentTrackingNumber || data.trackingNumber,
    trackingNumber: data.shipmentTrackingNumber || data.trackingNumber,
    trackingUrl: data.trackingUrl || null,
    labelUrl: piece.url || piece.documentUrl || null,
  };
};

module.exports = {
  id,
  name,
  isConfigured,
  quote,
  book,
};
