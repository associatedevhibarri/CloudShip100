const catchAsync = require('../utils/catchAsync');
const pricingService = require('../services/pricing.service');

const getQuote = catchAsync(async (req, res) => {
  const quote = await pricingService.getQuote(req.body);
  res.send(quote);
});

module.exports = {
  getQuote,
};
