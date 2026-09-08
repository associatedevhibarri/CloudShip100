const crypto = require('crypto');
const httpStatus = require('http-status');
const config = require('../../config/config');
const ApiError = require('../../utils/ApiError');
const { Booking } = require('../../models');
const logisticsClient = require('./logisticsClient.service');
const logger = require('../../config/logger');

/**
 * Payment bridge: capture shop money into CloudShip, then (and only then) book logistics.
 * PAYMENT_MODE=mock  → confirm endpoint flips status (dev / Stage 1 without Stripe keys)
 * PAYMENT_MODE=stripe → create PaymentIntent (requires STRIPE_SECRET_KEY)
 */

const createPaymentForBooking = async (booking) => {
  if (!booking) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Booking required');
  }
  if (booking.paymentStatus === 'paid') {
    return {
      mode: config.ecommerce.paymentMode,
      status: 'paid',
      paymentIntentId: booking.paymentIntentId,
      amount: booking.quotedPrice != null ? booking.quotedPrice : booking.value,
      currency: booking.currency || 'ZAR',
    };
  }

  const amount = booking.quotedPrice != null ? booking.quotedPrice : booking.value;
  const currency = (booking.currency || 'ZAR').toLowerCase();
  const mode = config.ecommerce.paymentMode;

  if (mode === 'stripe') {
    if (!config.ecommerce.stripeSecretKey) {
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'STRIPE_SECRET_KEY not configured');
    }
    // Lazy require so mock mode does not need the package installed hard-fail
    let stripe;
    try {
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      stripe = require('stripe')(config.ecommerce.stripeSecretKey);
    } catch (e) {
      throw new ApiError(
        httpStatus.SERVICE_UNAVAILABLE,
        'stripe package not installed — run npm i stripe or use PAYMENT_MODE=mock'
      );
    }
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        bookingId: String(booking.id || booking._id),
        bookingCode: booking.code,
      },
      automatic_payment_methods: { enabled: true },
    });
    await Booking.updateOne(
      { _id: booking.id || booking._id },
      { paymentStatus: 'awaiting', paymentIntentId: intent.id }
    );
    return {
      mode: 'stripe',
      status: 'awaiting',
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount,
      currency: currency.toUpperCase(),
    };
  }

  // mock
  const paymentIntentId = `mock_pi_${crypto.randomBytes(10).toString('hex')}`;
  await Booking.updateOne(
    { _id: booking.id || booking._id },
    { paymentStatus: 'awaiting', paymentIntentId }
  );
  return {
    mode: 'mock',
    status: 'awaiting',
    paymentIntentId,
    confirmUrl: `/v1/ecommerce/payments/${paymentIntentId}/confirm`,
    amount,
    currency: currency.toUpperCase(),
  };
};

/**
 * Confirm payment then book logistics exactly once.
 * @param {string} paymentIntentId
 */
const confirmPaymentAndBook = async (paymentIntentId) => {
  const booking = await Booking.findOne({ paymentIntentId });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment / booking not found');
  }
  if (booking.paymentStatus === 'paid' && booking.logisticsBookingRef) {
    return booking;
  }

  if (config.ecommerce.paymentMode === 'stripe' && !String(paymentIntentId).startsWith('mock_')) {
    if (!config.ecommerce.stripeSecretKey) {
      throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'STRIPE_SECRET_KEY not configured');
    }
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const stripe = require('stripe')(config.ecommerce.stripeSecretKey);
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      await Booking.updateOne({ _id: booking._id }, { paymentStatus: 'failed' });
      throw new ApiError(httpStatus.PAYMENT_REQUIRED, `Payment not succeeded (${intent.status})`);
    }
  }

  booking.paymentStatus = 'paid';
  await booking.save();

  if (!booking.logisticsBookingRef) {
    try {
      const booked = await logisticsClient.bookShipment({
        partner: booking.selectedPartner,
        service: booking.selectedService,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        weightKg: booking.weightKg,
        externalOrderId: booking.externalOrderId,
        quoteSnapshot: {
          carrierCost: booking.carrierCost,
          marginAmount: booking.marginAmount,
          quotedPrice: booking.quotedPrice,
        },
      });
      booking.logisticsBookingRef = booked.bookingRef;
      booking.trackingNumber = booked.trackingNumber || null;
      await booking.save();
    } catch (err) {
      logger.error(`Logistics book failed after payment for ${booking.code}: ${err.message}`);
      // Payment succeeded — do NOT silently pretend book worked. Flag for ops.
      booking.status = 'pending';
      await booking.save();
      throw new ApiError(
        httpStatus.BAD_GATEWAY,
        'Payment captured but courier booking failed — ops must retry book'
      );
    }
  }

  return booking;
};

module.exports = {
  createPaymentForBooking,
  confirmPaymentAndBook,
};
