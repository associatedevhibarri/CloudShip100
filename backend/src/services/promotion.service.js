const { Promotion } = require('../models');

/**
 * Get all promotions
 * @returns {Promise<Promotion[]>}
 */
const queryPromotions = async () => {
  return Promotion.find().sort('-postedAt');
};

module.exports = {
  queryPromotions,
};
