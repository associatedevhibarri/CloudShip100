const httpStatus = require('http-status');
const request = require('supertest');
const app = require('../../../src/app');
const setupTestDB = require('../../utils/setupTestDB');
const { User, Company, Booking, IntegrationEvent, StoreConnection } = require('../../../src/models');
const { applyMargin } = require('../../../src/integrations/bridge/margin.service');
const logisticsClient = require('../../../src/integrations/bridge/logisticsClient.service');
const quoteBridge = require('../../../src/integrations/bridge/quoteBridge.service');
const paymentBridge = require('../../../src/integrations/bridge/paymentBridge.service');
const orderBridge = require('../../../src/integrations/bridge/orderBridge.service');
const { getAdapter } = require('../../../src/integrations/ecommerce');
const { encryptCredentials, hmacSha256Hex, hmacSha256Base64 } = require('../../../src/integrations/utils/crypto.util');
const { tokenService } = require('../../../src/services');
const config = require('../../../src/config/config');

setupTestDB();

describe('E-commerce Stage 1 (Pratik)', () => {
  let company;
  let customer;
  let accessToken;

  beforeEach(async () => {
    customer = await User.create({
      name: 'Pratik Merchant',
      email: 'pratik.ecom@example.com',
      password: 'password1',
      role: 'customer',
      isEmailVerified: true,
    });
    company = await Company.create({
      name: 'Pratik Shop Co',
      contact: 'Pratik',
      email: 'pratik.ecom@example.com',
      owner: customer._id,
    });
    accessToken = await tokenService.generateAuthTokens(customer).then((t) => t.access.token);
  });

  describe('margin.service', () => {
    test('adds percent margin and rounds to cents', () => {
      const result = applyMargin(100, { percent: 15, fixed: 0 });
      expect(result.carrierCost).toBe(100);
      expect(result.marginAmount).toBe(15);
      expect(result.quotedPrice).toBe(115);
    });

    test('rejects negative carrier cost', () => {
      expect(() => applyMargin(-1)).toThrow(/non-negative/);
    });
  });

  describe('logistics stub (Vasanth contract — not implementing partners)', () => {
    test('returns multiple partners without LOGISTICS_API_URL', async () => {
      const quotes = await logisticsClient.getQuotes({
        pickup: 'Cape Town',
        dropoff: 'Johannesburg',
        weightKg: 2,
      });
      expect(quotes.options.length).toBeGreaterThanOrEqual(2);
      expect(quotes.options[0]).toEqual(
        expect.objectContaining({ partner: expect.any(String), price: expect.any(Number) })
      );
    });
  });

  describe('adapters normalize', () => {
    const fakeConn = {
      platform: 'woocommerce',
      storeUrl: 'https://shop.example',
      settings: { pickupAddress: 'Cape Town Warehouse' },
      credentialsEncrypted: encryptCredentials({ consumerKey: 'ck', consumerSecret: 'cs' }),
    };

    test('woocommerce maps shipping address', () => {
      const adapter = getAdapter('woocommerce');
      const normalized = adapter.normalizeOrder(
        {
          id: 501,
          currency: 'ZAR',
          billing: { email: 'buyer@test.com', phone: '081' },
          shipping: {
            address_1: '12 Main',
            city: 'Joburg',
            postcode: '2000',
            country: 'ZA',
          },
          line_items: [{ name: 'Box', quantity: 2, weight: 1 }],
        },
        fakeConn
      );
      expect(normalized.externalOrderId).toBe('501');
      expect(normalized.pickup).toContain('Cape Town');
      expect(normalized.dropoff).toContain('Joburg');
      expect(normalized.weightKg).toBe(2);
      expect(normalized.buyerEmail).toBe('buyer@test.com');
    });

    test('shopify converts grams to kg', () => {
      const adapter = getAdapter('shopify');
      const conn = {
        ...fakeConn,
        platform: 'shopify',
        credentialsEncrypted: encryptCredentials({ shopDomain: 'dev.myshopify.com', accessToken: 'shpat' }),
      };
      const normalized = adapter.normalizeOrder(
        {
          id: 9001,
          email: 's@test.com',
          currency: 'ZAR',
          shipping_address: { address1: '1 Beach', city: 'Durban', zip: '4001', country: 'ZA' },
          line_items: [{ title: 'Tee', quantity: 1, grams: 500 }],
        },
        conn
      );
      expect(normalized.weightKg).toBe(0.5);
      expect(normalized.dropoff).toContain('Durban');
    });

    test('lovable accepts CloudShip-shaped payload', () => {
      const adapter = getAdapter('lovable');
      const normalized = adapter.normalizeOrder({
        externalOrderId: 'LV-1',
        pickup: 'A',
        dropoff: 'B',
        weightKg: 3,
      });
      expect(normalized.externalOrderId).toBe('LV-1');
      expect(normalized.weightKg).toBe(3);
    });
  });

  describe('quote → ingest → pay → book (happy path)', () => {
    test('never books logistics before payment; books once after confirm', async () => {
      const conn = await StoreConnection.create({
        company: company._id,
        platform: 'lovable',
        storeName: 'Lovable Demo',
        storeUrl: 'https://lovable.dev/demo',
        credentialsEncrypted: encryptCredentials({ pickupAddress: 'Cape Town' }),
        webhookSecret: 'secret_lovable_test',
        publicApiKey: 'cs_live_testkey',
        status: 'active',
        settings: { pickupAddress: 'Cape Town', currency: 'ZAR', defaultMode: 'Road' },
      });

      const quote = await quoteBridge.createMarketplaceQuote({
        pickup: 'Cape Town',
        dropoff: 'Pretoria',
        weightKg: 2,
        storeConnectionId: conn._id,
        companyId: company._id,
      });
      expect(quote.selected.quotedPrice).toBeGreaterThan(quote.selected.carrierCost);
      expect(quote.selected.marginAmount).toBeGreaterThan(0);

      const adapter = getAdapter('lovable');
      const normalized = adapter.normalizeOrder({
        externalOrderId: 'ORD-100',
        pickup: 'Cape Town',
        dropoff: 'Pretoria',
        weightKg: 2,
      });

      const ingested = await orderBridge.ingestNormalizedOrder({
        storeConnection: conn,
        normalized,
        quoteId: quote.quoteId,
      });

      expect(ingested.duplicate).toBe(false);
      expect(ingested.booking.paymentStatus).toBe('awaiting');
      expect(ingested.booking.logisticsBookingRef).toBeFalsy();
      expect(ingested.payment.paymentIntentId).toBeTruthy();
      expect(ingested.booking.quotedPrice).toBe(quote.selected.quotedPrice);

      // Idempotency: same order again
      const again = await orderBridge.ingestNormalizedOrder({
        storeConnection: conn,
        normalized,
        quoteId: undefined,
      });
      expect(again.duplicate).toBe(true);
      expect(String(again.booking.id || again.booking._id)).toBe(
        String(ingested.booking.id || ingested.booking._id)
      );

      const events = await IntegrationEvent.find({ platform: 'lovable' });
      expect(events).toHaveLength(1);

      const paid = await paymentBridge.confirmPaymentAndBook(ingested.payment.paymentIntentId);
      expect(paid.paymentStatus).toBe('paid');
      expect(paid.logisticsBookingRef).toMatch(/^STUB-/);
      expect(paid.trackingNumber).toBeTruthy();

      // Second confirm is idempotent
      const paidAgain = await paymentBridge.confirmPaymentAndBook(ingested.payment.paymentIntentId);
      expect(paidAgain.logisticsBookingRef).toBe(paid.logisticsBookingRef);
    });
  });

  describe('HTTP webhooks + ecommerce API', () => {
    test('POST /v1/ecommerce/stores connects woo store and returns webhookSecret once', async () => {
      const res = await request(app)
        .post('/v1/ecommerce/stores')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          platform: 'woocommerce',
          storeName: 'Woo Demo',
          storeUrl: 'https://woo.example',
          credentials: {
            consumerKey: 'ck_test',
            consumerSecret: 'cs_test',
            pickupAddress: 'Cape Town',
          },
        })
        .expect(httpStatus.CREATED);

      expect(res.body.platform).toBe('woocommerce');
      expect(res.body.webhookSecret).toBeTruthy();
      expect(res.body.credentialsEncrypted).toBeUndefined();
    });

    test('Woo order webhook with valid signature creates booking awaiting payment', async () => {
      const webhookSecret = 'woo_wh_secret';
      const conn = await StoreConnection.create({
        company: company._id,
        platform: 'woocommerce',
        storeName: 'Woo',
        storeUrl: 'https://woo.example',
        credentialsEncrypted: encryptCredentials({
          consumerKey: 'ck',
          consumerSecret: 'cs',
          pickupAddress: 'Cape Town',
        }),
        webhookSecret,
        status: 'active',
        settings: { pickupAddress: 'Cape Town', currency: 'ZAR', defaultMode: 'Road' },
      });

      const payload = {
        id: 777,
        currency: 'ZAR',
        billing: { email: 'a@b.com' },
        shipping: { address_1: '9 Long', city: 'Cape Town', postcode: '8001', country: 'ZA' },
        line_items: [{ name: 'Parcel', quantity: 1, weight: 1.5 }],
      };
      const raw = JSON.stringify(payload);
      const signature = hmacSha256Base64(webhookSecret, raw);

      const res = await request(app)
        .post(`/v1/webhooks/woocommerce/orders/${conn._id}`)
        .set('Content-Type', 'application/json')
        .set('X-WC-Webhook-Signature', signature)
        .set('X-WC-Webhook-Topic', 'order.created')
        .send(payload)
        .expect(httpStatus.CREATED);

      expect(res.body.bookingCode).toMatch(/^BKG-MKT-/);
      expect(res.body.paymentStatus).toBe('awaiting');

      const booking = await Booking.findById(res.body.bookingId);
      expect(booking.source).toBe('woocommerce');
      expect(booking.externalOrderId).toBe('777');
      expect(booking.logisticsBookingRef).toBeFalsy();
    });

    test('rejects Woo webhook with bad signature', async () => {
      const conn = await StoreConnection.create({
        company: company._id,
        platform: 'woocommerce',
        storeName: 'Woo',
        storeUrl: 'https://woo.example',
        credentialsEncrypted: encryptCredentials({ consumerKey: 'ck', consumerSecret: 'cs' }),
        webhookSecret: 'real_secret',
        status: 'active',
      });

      await request(app)
        .post(`/v1/webhooks/woocommerce/orders/${conn._id}`)
        .set('X-WC-Webhook-Signature', 'not-valid')
        .send({ id: 1, shipping: { city: 'X' }, billing: {} })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('Shopify rates callback returns CarrierService shape', async () => {
      const conn = await StoreConnection.create({
        company: company._id,
        platform: 'shopify',
        storeName: 'Shopify Dev',
        storeUrl: 'dev-store.myshopify.com',
        credentialsEncrypted: encryptCredentials({
          shopDomain: 'dev-store.myshopify.com',
          accessToken: 'shpat_x',
          pickupAddress: 'Cape Town',
        }),
        webhookSecret: '',
        status: 'active',
        settings: { pickupAddress: 'Cape Town', currency: 'ZAR', defaultMode: 'Road' },
      });

      const res = await request(app)
        .post(`/v1/webhooks/shopify/rates/${conn._id}`)
        .send({
          rate: {
            origin: { address1: '1 Warehouse', city: 'Cape Town', country: 'ZA', postal_code: '8000' },
            destination: { address1: '2 Home', city: 'Durban', country: 'ZA', postal_code: '4000' },
            items: [{ name: 'Item', quantity: 1, grams: 1000 }],
            currency: 'ZAR',
          },
        })
        .expect(httpStatus.OK);

      expect(Array.isArray(res.body.rates)).toBe(true);
      expect(res.body.rates[0].service_name).toMatch(/CloudShip/);
      expect(res.body.rates[0].total_price).toMatch(/^\d+$/);
    });

    test('Lovable rates + order via API key', async () => {
      const webhookSecret = 'lov_secret';
      const conn = await StoreConnection.create({
        company: company._id,
        platform: 'lovable',
        storeName: 'LV',
        storeUrl: '',
        credentialsEncrypted: encryptCredentials({ pickupAddress: 'Cape Town' }),
        webhookSecret,
        publicApiKey: 'cs_live_abc',
        status: 'active',
        settings: { pickupAddress: 'Cape Town', currency: 'ZAR', defaultMode: 'Road' },
      });

      const rateBody = { pickup: 'Cape Town', dropoff: 'Stellenbosch', weightKg: 1 };
      const rateRaw = JSON.stringify(rateBody);
      const rateSig = hmacSha256Hex(webhookSecret, rateRaw);

      const rates = await request(app)
        .post('/v1/webhooks/lovable/rates')
        .set('X-CloudShip-Key', 'cs_live_abc')
        .set('X-CloudShip-Signature', rateSig)
        .set('Content-Type', 'application/json')
        .send(rateBody)
        .expect(httpStatus.OK);

      expect(rates.body.quoteId).toBeTruthy();
      expect(rates.body.selected.quotedPrice).toBeGreaterThan(0);

      const orderBody = {
        externalOrderId: 'LV-55',
        pickup: 'Cape Town',
        dropoff: 'Stellenbosch',
        weightKg: 1,
        quoteId: rates.body.quoteId,
      };
      const orderRaw = JSON.stringify(orderBody);
      const orderSig = hmacSha256Hex(webhookSecret, orderRaw);

      const order = await request(app)
        .post('/v1/webhooks/lovable/orders')
        .set('X-CloudShip-Key', 'cs_live_abc')
        .set('X-CloudShip-Signature', orderSig)
        .set('Content-Type', 'application/json')
        .send(orderBody)
        .expect(httpStatus.CREATED);

      expect(order.body.payment.mode).toBe(config.ecommerce.paymentMode);

      await request(app)
        .post(`/v1/ecommerce/payments/${order.body.payment.paymentIntentId}/confirm`)
        .send()
        .expect(httpStatus.OK);

      const booking = await Booking.findById(order.body.bookingId);
      expect(booking.paymentStatus).toBe('paid');
      expect(booking.logisticsBookingRef).toBeTruthy();
      // unused conn var silence
      expect(conn.platform).toBe('lovable');
    });

    test('marketplace quote via authenticated ecommerce API', async () => {
      const res = await request(app)
        .post('/v1/ecommerce/quotes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          pickup: 'Cape Town',
          dropoff: 'Sandton',
          weightKg: 5,
        })
        .expect(httpStatus.CREATED);

      expect(res.body.options.length).toBeGreaterThan(0);
      expect(res.body.selected.marginPercent).toBe(config.ecommerce.marginPercent);
    });

    test('serves Lovable SDK script', async () => {
      const res = await request(app).get('/v1/public/cloudship.js').expect(httpStatus.OK);
      expect(res.text).toMatch(/CloudShip/);
    });
  });

  describe('future-proof guards', () => {
    test('expired quote cannot be used to ingest', async () => {
      const { ShipmentQuote } = require('../../../src/models');
      const conn = await StoreConnection.create({
        company: company._id,
        platform: 'wix',
        storeName: 'Wix',
        storeUrl: 'https://wix.example',
        credentialsEncrypted: encryptCredentials({ accessToken: 'tok', pickupAddress: 'CT' }),
        webhookSecret: '',
        status: 'active',
        settings: { pickupAddress: 'CT', currency: 'ZAR', defaultMode: 'Road' },
      });
      const quote = await quoteBridge.createMarketplaceQuote({
        pickup: 'CT',
        dropoff: 'JHB',
        weightKg: 1,
        storeConnectionId: conn._id,
        companyId: company._id,
      });
      await ShipmentQuote.updateOne({ quoteId: quote.quoteId }, { expiresAt: new Date(Date.now() - 1000) });

      const adapter = getAdapter('wix');
      const normalized = adapter.normalizeOrder(
        {
          order: {
            id: 'wix-1',
            shippingInfo: {
              logistics: {
                shippingDestination: { addressLine: '1 St', city: 'JHB', country: 'ZA' },
              },
            },
            lineItems: [{ productName: 'Item', physicalProperties: { weight: 1 } }],
          },
        },
        conn
      );

      await expect(
        orderBridge.ingestNormalizedOrder({
          storeConnection: conn,
          normalized,
          quoteId: quote.quoteId,
        })
      ).rejects.toThrow(/expired/i);
    });

    test('unknown platform adapter throws', () => {
      expect(() => getAdapter('amazon')).toThrow(/Unsupported/);
    });
  });
});
