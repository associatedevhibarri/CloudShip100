const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { promotionService } = require('../services');

const getPromotions = catchAsync(async (req, res) => {
  const promotions = await promotionService.queryPromotions();
  res.send(promotions);
});

const createPromotion = catchAsync(async (req, res) => {
  const promotion = await promotionService.createPromotion(req.body);
  res.status(httpStatus.CREATED).send(promotion);
});

module.exports = {
  getPromotions,
  createPromotion,
};
