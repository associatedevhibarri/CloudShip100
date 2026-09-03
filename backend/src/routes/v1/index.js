const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const driverRoute = require('./driver.route');
const warehouseRoute = require('./warehouse.route');
const docsRoute = require('./docs.route');
const companyRoute = require('./company.route');
const bookingRoute = require('./booking.route');
const invoiceRoute = require('./invoice.route');
const contractRoute = require('./contract.route');
const kycDocumentRoute = require('./kycDocument.route');
const paymentRequestRoute = require('./paymentRequest.route');
const notificationRoute = require('./notification.route');
const promotionRoute = require('./promotion.route');
const pricingRoute = require('./pricing.route');
const leadRoute = require('./lead.route');
const geofenceRoute = require('./geofence.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/drivers',
    route: driverRoute,
  },
  {
    path: '/warehouse',
    route: warehouseRoute,
  },
  {
    path: '/companies',
    route: companyRoute,
  },
  {
    path: '/bookings',
    route: bookingRoute,
  },
  {
    path: '/invoices',
    route: invoiceRoute,
  },
  {
    path: '/contracts',
    route: contractRoute,
  },
  {
    path: '/kyc-documents',
    route: kycDocumentRoute,
  },
  {
    path: '/payment-requests',
    route: paymentRequestRoute,
  },
  {
    path: '/notifications',
    route: notificationRoute,
  },
  {
    path: '/promotions',
    route: promotionRoute,
  },
  {
    path: '/pricing',
    route: pricingRoute,
  },
  {
    path: '/leads',
    route: leadRoute,
  },
  {
    path: '/geofences',
    route: geofenceRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
