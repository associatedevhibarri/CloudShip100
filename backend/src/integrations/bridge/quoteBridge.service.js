const crypto = require('crypto');
const httpStatus = require('http-status');
const { ShipmentQuote } = require('../../models');
const ApiError = require('../../utils/ApiError');
const config = require('../../config/config');
const logisticsClient = require('./logisticsClient.service');
const { applyMargin } = require('./margin.service');

const buildQuoteId = () => `qt_${crypto.randomBytes(12).toString('hex')}`;

/**
 * Get live carrier quotes, apply margin, persist snapshot for checkout + later book.
 * @param {Object} input
 * @param {string} input.pickup
 * @param {string} input.dropoff
 * @param {number} input.weightKg
 * @param {string} [input.mode]
 * @param {string} [input.currency]
 * @param {ObjectId} [input.storeConnectionId]
 * @param {ObjectId} [input.companyId]
 * @param {string} [input.preferredPartner]
 */
const createMarketplaceQuote = async (input) => {
  const pickup = String(input.pickup || '').trim();
  const dropoff = String(input.dropoff || '').trim();
  const weightKg = Number(input.weightKg);
  const mode = input.mode || 'Road';
  const currency = (input.currency || 'ZAR').toUpperCase();

  if (!pickup || !dropoff) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'pickup and dropoff are required');
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'weightKg must be > 0');
  }

  const raw = await logisticsClient.getQuotes({
    pickup,
    dropoff,
    weightKg,
    currency,
    mode,
  });

  const options = (raw.options || []).map((opt) => {
    const money = applyMargin(opt.price);
    return {
      partner: opt.partner,
      service: opt.service,
      carrierCost: money.carrierCost,
      marginAmount: money.marginAmount,
      marginPercent: money.marginPercent,
      quotedPrice: money.quotedPrice,
      etaHours: opt.etaHours != null ? opt.etaHours : null,
      currency: (opt.currency || currency).toUpperCase(),
    };
  });

  if (!options.length) {
    throw new ApiError(httpStatus.BAD_GATEWAY, 'No logistics rates available');
  }

  let selected = options[0];
  if (input.preferredPartner) {
    const match = options.find((o) => o.partner === input.preferredPartner);
    if (match) selected = match;
  }
  // Cheapest by default when no preference
  if (!input.preferredPartner) {
    selected = options.reduce((best, cur) => (cur.quotedPrice < best.quotedPrice ? cur : best), options[0]);
  }

  const ttlMin = config.ecommerce.quoteTtlMinutes;
  const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);
  const quoteId = buildQuoteId();

  const doc = await ShipmentQuote.create({
    quoteId,
    storeConnection: input.storeConnectionId || null,
    company: input.companyId || null,
    pickup,
    dropoff,
    weightKg,
    mode,
    currency,
    options,
    selectedPartner: selected.partner,
    selectedService: selected.service,
    carrierCost: selected.carrierCost,
    marginAmount: selected.marginAmount,
    marginPercent: selected.marginPercent,
    quotedPrice: selected.quotedPrice,
    expiresAt,
  });

  return {
    quoteId: doc.quoteId,
    expiresAt: doc.expiresAt,
    pickup: doc.pickup,
    dropoff: doc.dropoff,
    weightKg: doc.weightKg,
    mode: doc.mode,
    currency: doc.currency,
    options,
    selected: {
      partner: selected.partner,
      service: selected.service,
      carrierCost: selected.carrierCost,
      marginAmount: selected.marginAmount,
      marginPercent: selected.marginPercent,
      quotedPrice: selected.quotedPrice,
      etaHours: selected.etaHours,
      currency: selected.currency,
    },
  };
};

/**
 * Load a quote that is still valid and not consumed.
 * @param {string} quoteId
 * @param {{ partner?: string, service?: string }} [select]
 */
const getValidQuote = async (quoteId, select = {}) => {
  const doc = await ShipmentQuote.findOne({ quoteId });
  if (!doc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Quote not found');
  }
  if (doc.consumedAt) {
    throw new ApiError(httpStatus.CONFLICT, 'Quote already used');
  }
  if (doc.expiresAt.getTime() < Date.now()) {
    throw new ApiError(httpStatus.GONE, 'Quote expired — request a new rate');
  }

  let carrierCost = doc.carrierCost;
  let marginAmount = doc.marginAmount;
  let marginPercent = doc.marginPercent;
  let quotedPrice = doc.quotedPrice;
  let partner = doc.selectedPartner;
  let service = doc.selectedService;

  if (select.partner) {
    const opt = (doc.options || []).find(
      (o) => o.partner === select.partner && (!select.service || o.service === select.service)
    );
    if (!opt) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Selected partner/service not in quote');
    }
    carrierCost = opt.carrierCost;
    marginAmount = opt.marginAmount;
    marginPercent = opt.marginPercent;
    quotedPrice = opt.quotedPrice;
    partner = opt.partner;
    service = opt.service;
  }

  return {
    doc,
    carrierCost,
    marginAmount,
    marginPercent,
    quotedPrice,
    partner,
    service,
  };
};

const markQuoteConsumed = async (quoteId) => {
  await ShipmentQuote.updateOne({ quoteId }, { consumedAt: new Date() });
};

module.exports = {
  createMarketplaceQuote,
  getValidQuote,
  markQuoteConsumed,
  buildQuoteId,
};
