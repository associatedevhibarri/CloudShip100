const config = require('../../config/config');
const { applyMargin } = require('./margin');
const quoteStore = require('./quoteStore');
const { publicQuotes, friendlyBookMessage } = require('./publicQuote');
const {
  SPEED_LABEL,
  classifySpeed,
  minutesFromMeta,
  transitDaysFromMeta,
  normalizeOptions,
} = require('./speed');
const courierGuy = require('./courierGuy.adapter');
const uberDirect = require('./uberDirect.adapter');
const dhlExpress = require('./dhlExpress.adapter');
const fedex = require('./fedex.adapter');
const dsv = require('./dsv.adapter');

const adapters = [courierGuy, uberDirect, dhlExpress, fedex, dsv];

const getAdapter = (partnerId) => adapters.find((adapter) => adapter.id === partnerId);

const unavailable = (adapter, error) => [
  {
    partnerId: adapter.id,
    partnerName: adapter.name,
    available: false,
    error,
  },
];

const priceOption = (adapter, shipment, option) => {
  const priced = applyMargin(option.partnerPrice, config.margin);
  const stored = quoteStore.put({
    partnerId: adapter.id,
    partnerName: adapter.name,
    shipment,
    ...option,
    ...priced,
  });
  const speed = classifySpeed({
    partnerId: adapter.id,
    serviceName: option.serviceName,
    serviceCode: option.serviceCode,
  });
  const meta = option.meta || {};
  return {
    partnerId: adapter.id,
    partnerName: adapter.name,
    available: true,
    quoteId: stored.quoteId,
    expiresAt: option.expiresAt || stored.expiresAt,
    partnerPrice: priced.partnerPrice,
    marginAmount: priced.marginAmount,
    sellPrice: priced.sellPrice,
    currency: option.currency || 'ZAR',
    serviceName: option.serviceName,
    serviceCode: option.serviceCode,
    speed,
    speedLabel: SPEED_LABEL[speed],
    durationMinutes: minutesFromMeta(meta),
    pickupMinutes: Number.isFinite(Number(meta.pickupDuration)) ? Number(meta.pickupDuration) : null,
    transitDays: transitDaysFromMeta(meta),
    deliveryDate: meta.deliveryDate || null,
    error: null,
  };
};

const quoteAdapter = async (adapter, shipment) => {
  if (!adapter.isConfigured()) {
    return unavailable(adapter, 'Not configured. Add API credentials to the backend .env');
  }
  try {
    const raw = await adapter.quote(shipment);
    const options = normalizeOptions(raw).filter((row) => Number.isFinite(Number(row.partnerPrice)));
    if (!options.length) {
      return unavailable(adapter, 'No rates returned');
    }
    return options.map((option) => priceOption(adapter, shipment, option));
  } catch (err) {
    return unavailable(adapter, err.message || 'Quote failed');
  }
};

const quoteAll = async (shipment) => {
  const nested = await Promise.all(adapters.map((adapter) => quoteAdapter(adapter, shipment)));
  const partners = nested.flat();
  const available = partners.filter((row) => row.available);
  available.sort((a, b) => a.sellPrice - b.sellPrice);
  const withDuration = available.filter((row) => Number.isFinite(row.durationMinutes) && row.durationMinutes > 0);
  const fastest = withDuration.length
    ? [...withDuration].sort((a, b) => a.durationMinutes - b.durationMinutes)[0]
    : null;
  return { partners, cheapest: available[0] || null, fastest };
};

const bookStoredQuote = async (quoteId, extras = {}) => {
  const stored = quoteStore.get(quoteId);
  if (!stored) {
    throw new Error('Quote expired or not found. Request a new price.');
  }
  const adapter = getAdapter(stored.partnerId);
  if (!adapter) {
    throw new Error(`Unknown partner ${stored.partnerId}`);
  }
  const shipment = {
    ...stored.shipment,
    pickupPhone: stored.shipment.pickupPhone || extras.pickupPhone,
    dropoffPhone: stored.shipment.dropoffPhone || extras.dropoffPhone,
    pickupName: stored.shipment.pickupName || extras.pickupName,
    dropoffName: stored.shipment.dropoffName || extras.dropoffName,
  };
  const booked = await adapter.book(shipment, stored);
  return {
    ...booked,
    partnerId: stored.partnerId,
    partnerName: stored.partnerName,
    partnerPrice: stored.partnerPrice,
    marginAmount: stored.marginAmount,
    sellPrice: stored.sellPrice,
    currency: stored.currency,
    serviceName: stored.serviceName,
  };
};

module.exports = {
  adapters,
  getAdapter,
  quoteAll,
  publicQuotes,
  bookStoredQuote,
  friendlyBookMessage,
};
