const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../config/logger');

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  const msg = { from: config.email.from, to, subject, text };
  await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `http://link-to-app/reset-password?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `http://link-to-app/verify-email?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

const sendEmailSafe = async (to, subject, text) => {
  if (!to) return;
  try {
    await sendEmail(to, subject, text);
  } catch (err) {
    logger.warn(`Email to ${to} failed: ${err.message}`);
  }
};

const sendShipmentBookedEmails = async ({ booking, shopEmail, shopName }) => {
  const track = booking.trackingNumber || booking.logisticsBookingRef || booking.code;
  const widget = `${config.frontendUrl}/embed/track?code=${encodeURIComponent(booking.code)}`;
  const buyerText = `Your delivery is booked.

Booking: ${booking.code}
From: ${booking.pickup}
To: ${booking.dropoff}
Courier: ${booking.partnerName || booking.selectedPartner || 'CloudShip'}
Tracking number: ${track}
Track here: ${widget}
${booking.trackingUrl ? `Courier tracking: ${booking.trackingUrl}` : ''}

Thank you for shopping with ${shopName || 'us'}.`;

  const shopText = `A shopper paid for delivery. The courier is booked.

Booking: ${booking.code}
Shop order: ${booking.externalOrderId || '-'}
Customer pays: ${booking.quotedPrice} ${booking.currency || ''}
Courier cost: ${booking.carrierCost != null ? booking.carrierCost : '-'}
From: ${booking.pickup}
To: ${booking.dropoff}
Tracking: ${track}
Track: ${widget}`;

  await sendEmailSafe(booking.buyerEmail, `Your delivery ${booking.code} is booked`, buyerText);
  await sendEmailSafe(shopEmail, `CloudShip booked ${booking.code}`, shopText);
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendShipmentBookedEmails,
};
