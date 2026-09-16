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
const dashboardRoute = require('./dashboard.route');
const kycDocumentRoute = require('./kycDocument.route');
const paymentRequestRoute = require('./paymentRequest.route');
const notificationRoute = require('./notification.route');
const promotionRoute = require('./promotion.route');
const pricingRoute = require('./pricing.route');
const placesRoute = require('./places.route');
const leadRoute = require('./lead.route');
const geofenceRoute = require('./geofence.route');
const ecommerceRoute = require('./ecommerce.route');
const financeRoute = require('./finance.route');
const tripsRoute = require('./trips.route');
const expenseRoute = require('./expense.route');
const fleetRoute = require('./fleet.route');
const webhooksRoute = require('./webhooks.route');
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
    path: '/dashboard',
    route: dashboardRoute,
  },
  {
    path: '/finance',
    route: financeRoute,
  },
  {
    path: '/trips',
    route: tripsRoute,
  },
  {
    path: '/expenses',
    route: expenseRoute,
  },
  {
    path: '/fleet',
    route: fleetRoute,
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
    path: '/places',
    route: placesRoute,
  },
  {
    path: '/leads',
    route: leadRoute,
  },
  {
    path: '/geofences',
    route: geofenceRoute,
  },
  {
    path: '/ecommerce',
    route: ecommerceRoute,
  },
  {
    path: '/webhooks',
    route: webhooksRoute,
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
