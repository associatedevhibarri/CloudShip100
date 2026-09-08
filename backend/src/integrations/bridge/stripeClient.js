const Stripe = require('stripe');
const config = require('../../config/config');

let client = null;

const getStripe = () => {
  if (!config.ecommerce.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  if (!client) {
    client = new Stripe(config.ecommerce.stripeSecretKey);
  }
  return client;
};

module.exports = {
  getStripe,
};
