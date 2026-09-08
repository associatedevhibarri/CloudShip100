const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    GOOGLE_MAPS_API_KEY: Joi.string().allow('').description('Google Maps Platform API key (Directions API)'),
    CLOUDINARY_CLOUD_NAME: Joi.string().allow('').description('Cloudinary cloud name'),
    CLOUDINARY_API_KEY: Joi.string().allow('').description('Cloudinary API key'),
    CLOUDINARY_API_SECRET: Joi.string().allow('').description('Cloudinary API secret'),
    // E-commerce marketplace (Pratik Stage 1)
    ECOM_MARGIN_PERCENT: Joi.number().min(0).default(15),
    ECOM_MARGIN_FIXED: Joi.number().min(0).default(0),
    ECOM_QUOTE_TTL_MINUTES: Joi.number().min(1).default(30),
    PAYMENT_MODE: Joi.string().valid('mock', 'stripe').default('mock'),
    STRIPE_SECRET_KEY: Joi.string().allow('').description('Stripe secret key when PAYMENT_MODE=stripe'),
    LOGISTICS_API_URL: Joi.string().allow('').description('Vasanth internal logistics API base URL'),
    LOGISTICS_API_KEY: Joi.string().allow('').description('Bearer token for logistics API'),
    ECOM_CREDENTIALS_SECRET: Joi.string().allow('').description('AES key material for store credentials'),
    // Carrier marketplace margin + partner credentials (Vasanth)
    CLOUDSHIP_MARGIN_PERCENT: Joi.number().min(0).default(10),
    CLOUDSHIP_MARGIN_FLAT: Joi.number().min(0).default(0),
    COURIER_GUY_API_TOKEN: Joi.string().allow('').default(''),
    COURIER_GUY_API_URL: Joi.string().allow('').default('https://api.shiplogic.com'),
    UBER_DIRECT_CLIENT_ID: Joi.string().allow('').default(''),
    UBER_DIRECT_CLIENT_SECRET: Joi.string().allow('').default(''),
    UBER_DIRECT_CUSTOMER_ID: Joi.string().allow('').default(''),
    DHL_EXPRESS_API_KEY: Joi.string().allow('').default(''),
    DHL_EXPRESS_API_SECRET: Joi.string().allow('').default(''),
    DHL_EXPRESS_ACCOUNT: Joi.string().allow('').default(''),
    DHL_EXPRESS_BASE_URL: Joi.string().allow('').default('https://express.api.dhl.com/mydhlapi/test'),
    FEDEX_CLIENT_ID: Joi.string().allow('').default(''),
    FEDEX_CLIENT_SECRET: Joi.string().allow('').default(''),
    FEDEX_ACCOUNT_NUMBER: Joi.string().allow('').default(''),
    FEDEX_BASE_URL: Joi.string().allow('').default('https://apis-sandbox.fedex.com'),
    DSV_SUBSCRIPTION_KEY: Joi.string().allow('').default(''),
    DSV_CLIENT_ID: Joi.string().allow('').default(''),
    DSV_CLIENT_SECRET: Joi.string().allow('').default(''),
    DSV_SERVICE_AUTH: Joi.string().allow('').default(''),
    DSV_PAT: Joi.string().allow('').default(''),
    DSV_BASE_URL: Joi.string().allow('').default('https://api.dsv.com/my-demo'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  googleMaps: {
    apiKey: envVars.GOOGLE_MAPS_API_KEY || '',
  },
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME || '',
    apiKey: envVars.CLOUDINARY_API_KEY || '',
    apiSecret: envVars.CLOUDINARY_API_SECRET || '',
  },
  ecommerce: {
    marginPercent: envVars.ECOM_MARGIN_PERCENT,
    marginFixed: envVars.ECOM_MARGIN_FIXED,
    quoteTtlMinutes: envVars.ECOM_QUOTE_TTL_MINUTES,
    paymentMode: envVars.PAYMENT_MODE,
    stripeSecretKey: envVars.STRIPE_SECRET_KEY || '',
    logisticsApiUrl: envVars.LOGISTICS_API_URL || '',
    logisticsApiKey: envVars.LOGISTICS_API_KEY || '',
    credentialsSecret: envVars.ECOM_CREDENTIALS_SECRET || '',
  },
  margin: {
    percent: envVars.CLOUDSHIP_MARGIN_PERCENT,
    flat: envVars.CLOUDSHIP_MARGIN_FLAT,
  },
  carriers: {
    courierGuy: {
      token: envVars.COURIER_GUY_API_TOKEN || '',
      baseUrl: envVars.COURIER_GUY_API_URL || 'https://api.shiplogic.com',
    },
    uberDirect: {
      clientId: envVars.UBER_DIRECT_CLIENT_ID || '',
      clientSecret: envVars.UBER_DIRECT_CLIENT_SECRET || '',
      customerId: envVars.UBER_DIRECT_CUSTOMER_ID || '',
    },
    dhlExpress: {
      apiKey: envVars.DHL_EXPRESS_API_KEY || '',
      apiSecret: envVars.DHL_EXPRESS_API_SECRET || '',
      account: envVars.DHL_EXPRESS_ACCOUNT || '',
      baseUrl: envVars.DHL_EXPRESS_BASE_URL || 'https://express.api.dhl.com/mydhlapi/test',
    },
    fedex: {
      clientId: envVars.FEDEX_CLIENT_ID || '',
      clientSecret: envVars.FEDEX_CLIENT_SECRET || '',
      accountNumber: envVars.FEDEX_ACCOUNT_NUMBER || '',
      baseUrl: envVars.FEDEX_BASE_URL || 'https://apis-sandbox.fedex.com',
    },
    dsv: {
      subscriptionKey: envVars.DSV_SUBSCRIPTION_KEY || '',
      clientId: envVars.DSV_CLIENT_ID || '',
      clientSecret: envVars.DSV_CLIENT_SECRET || '',
      serviceAuth: envVars.DSV_SERVICE_AUTH || '',
      pat: envVars.DSV_PAT || '',
      baseUrl: envVars.DSV_BASE_URL || 'https://api.dsv.com/my-demo',
    },
  },
};
