const catchAsync = require('../utils/catchAsync');
const pricingService = require('../services/pricing.service');

const getQuote = catchAsync(async (req, res) => {
  const quote = await pricingService.getQuote(req.body);
  res.send(quote);
});

const getRates = catchAsync(async (req, res) => {
  const rates = await pricingService.getRates();
  res.send(rates);
});

const upsertRates = catchAsync(async (req, res) => {
  const rates = await pricingService.upsertRates(req.body.rates, req.user?.id || null);
  res.send(rates);
});

module.exports = {
  getQuote,
  getRates,
  upsertRates,
};
