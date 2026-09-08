const express = require('express');
const webhookController = require('../../controllers/webhook.controller');

const router = express.Router();

/**
 * Public webhook / rate endpoints.
 * Always pass ?connectionId=... or X-CloudShip-Connection-Id until OAuth shop mapping is hardened.
 */

router.post('/woocommerce/orders', webhookController.wooOrder);
router.post('/woocommerce/orders/:connectionId', webhookController.wooOrder);
router.post('/woocommerce/rates', webhookController.wooRates);
router.post('/woocommerce/rates/:connectionId', webhookController.wooRates);

router.post('/shopify/orders', webhookController.shopifyOrder);
router.post('/shopify/orders/:connectionId', webhookController.shopifyOrder);
router.post('/shopify/rates', webhookController.shopifyRates);
router.post('/shopify/rates/:connectionId', webhookController.shopifyRates);

router.post('/wix/orders', webhookController.wixOrder);
router.post('/wix/orders/:connectionId', webhookController.wixOrder);
router.post('/wix/rates', webhookController.wixRates);
router.post('/wix/rates/:connectionId', webhookController.wixRates);

router.post('/lovable/orders', webhookController.lovableOrder);
router.post('/lovable/rates', webhookController.lovableRates);

router.post('/stripe', webhookController.stripeWebhook);

module.exports = router;
