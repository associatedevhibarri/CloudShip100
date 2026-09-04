const { Promotion } = require('../models');

/**
 * Get all promotions
 * @returns {Promise<Promotion[]>}
 */
const queryPromotions = async () => {
  return Promotion.find().sort('-postedAt');
};

/**
 * Create and broadcast a new promotion to all customers
 * @param {Object} body - { title, body, tag? }
 * @returns {Promise<Promotion>}
 */
const createPromotion = async (body) => {
  return Promotion.create(body);
};

module.exports = {
  queryPromotions,
  createPromotion,
};
