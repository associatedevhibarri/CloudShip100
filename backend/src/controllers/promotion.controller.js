const catchAsync = require('../utils/catchAsync');
const { promotionService } = require('../services');

const getPromotions = catchAsync(async (req, res) => {
  const promotions = await promotionService.queryPromotions();
  res.send(promotions);
});

module.exports = {
  getPromotions,
};
