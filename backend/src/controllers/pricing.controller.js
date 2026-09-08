const catchAsync = require('../utils/catchAsync');
const pricingService = require('../services/pricing.service');
const carrierQuoteService = require('../services/carrierQuote.service');

const getQuote = catchAsync(async (req, res) => {
  const quote = await carrierQuoteService.getQuotes(req.body);
  res.send(quote);
});

const getRates = catchAsync(async (req, res) => {
  const rates = await pricingService.getRates();
  res.send(rates);
});

const upsertRates = catchAsync(async (req, res) => {
  const rates = await pricingService.upsertRates(req.body.rates, (req.user && req.user.id) || null);
  res.send(rates);
});

module.exports = {
  getQuote,
  getRates,
  upsertRates,
};
