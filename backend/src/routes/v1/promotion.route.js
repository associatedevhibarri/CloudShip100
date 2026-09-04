const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const promotionValidation = require('../../validations/promotion.validation');
const promotionController = require('../../controllers/promotion.controller');

const router = express.Router();

router
  .route('/')
  .get(auth('viewPromotions'), promotionController.getPromotions)
  .post(auth('managePromotions'), validate(promotionValidation.create), promotionController.createPromotion);

module.exports = router;
