const express = require('express');
const auth = require('../../middlewares/auth');
const promotionController = require('../../controllers/promotion.controller');

const router = express.Router();

router.get('/', auth('viewPromotions'), promotionController.getPromotions);

module.exports = router;
