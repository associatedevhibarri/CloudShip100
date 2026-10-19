const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const policy = require('../../src/integrations/marketplacePolicy');
const connection = { _id: 'c'.repeat(24), company: 'company', webhookSecret: 'server-secret', storeName: 'Commoditopia' };
const input = { pickup: '2 Main Rd, Sandton, 2196, ZA', pickupPhone: '+27820000000', dropoff: '1 Main Rd, Cape Town, 8000, ZA', parcels: [{ quantity: 2, weightKg: 1, lengthCm: 20, widthCm: 15, heightCm: 10, commodity: { cargoForm: 'solid', packagingType: 'bagged' } }] };
function harness() {
  let quote, dispatch, count = 0, calls = 0, price = 50, fail = false;
  const bookings = [], routes = {};
  const document = data => ({ ...data, async save() { return this; }, markModified() {} });
  class Schema { index() {} } Schema.Types = { ObjectId: String };
  const models = {
    MarketplaceParcelQuote: { async create(data) { quote = document({ ...data, _id: 'a'.repeat(24) }); return quote; }, async findOne(query) { return quote && String(query._id) === String(quote._id) && query.connection === quote.connection ? quote : null; } },
    MarketplaceDispatch: { async create(data) { dispatch = document({ ...data, _id: 'd'.repeat(24) }); return dispatch; }, async findOne(query) { return dispatch && query.connection === dispatch.connection && query.externalOrderId === dispatch.externalOrderId ? dispatch : null; }, async findOneAndUpdate(query, update) { if (dispatch.leaseUntil) return null; Object.assign(dispatch, update.$set); return dispatch; }, async updateOne() { delete dispatch.leaseUntil; } },
  };
  const router = { use(handler) { routes.auth = handler; }, post(route, handler) { routes[route] = handler; } };
  const mocked = name => {
    if (name === 'express') return { Router: () => router };
    if (name === 'crypto') return crypto;
    if (name === 'mongoose') return { Schema, models, Types: { ObjectId: { isValid: value => /^[a-f0-9]{24}$/.test(value) } }, model: name => models[name] };
    if (name === '../../models') return { StoreConnection: { findOne: async () => connection }, Booking: { async create(data) { const booking = document({ ...data, _id: `booking-${count++}` }); bookings.push(booking); return booking; }, async find(query) { return bookings.filter(booking => query._id.$in.includes(booking._id)); } } };
    if (name.endsWith('/ApiError')) return class ApiError extends Error { constructor(code, message) { super(message); this.statusCode = code; } };
    if (name.endsWith('/catchAsync')) return fn => fn;
    if (name.endsWith('/marketplacePolicy')) return policy;
    if (name.endsWith('/carrierTracking.service')) return { refreshBookingTracking: async () => {} };
    if (name.endsWith('/shipmentProgress')) return { displayShipmentStatus: booking => booking.courierStatus === 'delivered' ? 'delivered' : booking.courierStatus === 'collected' ? 'warehouse' : 'booked' };
    if (name.endsWith('/carriers')) return { async quoteAll() { return { partners: [{ available: true, partnerId: 'courier_guy', serviceName: 'Economy', currency: 'ZAR', sellPrice: price, partnerPrice: price / 1.1, marginAmount: price - price / 1.1, quoteId: `rate-${count++}`, expiresAt: new Date(Date.now() + 900000) }] }; }, async bookStoredQuote() { calls++; if (fail) throw new Error('Timeout after sending booking'); return { carrierShipmentId: `carrier-${calls}`, trackingNumber: `tracking-${calls}`, trackingUrl: `https://carrier.test/${calls}` }; } };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../src/routes/v1/marketplace.route.js'), 'utf8'), { require: mocked, module, Buffer, process, Date, console });
  async function call(route, body) { let response; await routes[route]({ body, connectionRecord: connection }, { send(data) { response = data; return data; } }); return response; }
  return { call, routes, bookings, quote: () => quote, dispatch: () => dispatch, calls: () => calls, setPrice(value) { price = value; }, setFail(value) { fail = value; } };
}
test('commodity policy separates unsupported cargo, incomplete details, and ordinary packaged solids', () => {
  assert.equal(policy.eligibility([{}]).status, 'incomplete');
  assert.equal(policy.eligibility([{ cargoForm: 'gas', packagingType: 'bagged' }]).status, 'unsupported');
  assert.equal(policy.eligibility([{ cargoForm: 'solid', packagingType: 'bagged', perishable: true }]).status, 'unsupported');
  assert.equal(policy.eligibility([{ cargoForm: 'solid', packagingType: 'bagged' }]).status, 'eligible');
  assert.throws(() => policy.expandShipment({ ...input, parcels: [{ ...input.parcels[0], quantity: 21 }] }), /20 parcels/);
});
test('authentication requires a fresh HMAC over the exact bytes; public API key alone is insufficient', async () => {
  const h = harness(), timestamp = String(Date.now()), rawBody = Buffer.from(JSON.stringify(input));
  const req = { headers: { 'x-cloudship-key': 'key', 'x-cloudship-timestamp': timestamp }, rawBody, body: input };
  await assert.rejects(h.routes.auth(req, {}, () => {}), /signed CloudShip/);
  req.headers['x-cloudship-signature'] = crypto.createHmac('sha256', connection.webhookSecret).update(`${timestamp}.${rawBody}`).digest('hex');
  let authenticated = false; await h.routes.auth(req, {}, () => { authenticated = true; }); assert.ok(authenticated);
  req.rawBody = Buffer.from('{}'); await assert.rejects(h.routes.auth(req, {}, () => {}), /Invalid CloudShip signature/);
});
test('account settlement must be approved before rates or bookings; prices preserve carrier currency', async () => {
  const previous = process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS;
  try {
    delete process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS;
    const h = harness(); await assert.rejects(h.call('/rates', input), /settlement/);
    process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS = connection._id;
    const quote = await h.call('/rates', input);
    assert.equal(quote.options[0].quotedPrice, 100); assert.equal(quote.options[0].currency, 'ZAR');
  } finally { if (previous === undefined) delete process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS; else process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS = previous; }
});
test('bookings reject price tampering, re-quote expired rates, and cannot duplicate parcel collections', async () => {
  const previous = process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS; process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS = connection._id;
  try {
    const h = harness(), quote = await h.call('/rates', input);
    const body = { externalOrderId: 'order:group', quoteId: quote.quoteId, partner: 'courier_guy', service: 'Economy', maxAmount: 100, currency: 'ZAR', buyerPhone: '+27820000001' };
    await assert.rejects(h.call('/book', { ...body, maxAmount: 1 }), /original quoted price/);
    h.quote().expiresAt = new Date(0);
    const booked = await h.call('/book', body);
    assert.equal(booked.bookingStatus, 'booked'); assert.equal(h.calls(), 2);
    assert.equal(h.bookings[0].paymentStatus, 'awaiting'); // Invoice remains unpaid; no second buyer payment.
    await h.call('/book', body); assert.equal(h.calls(), 2);
    h.bookings[0].courierStatus = 'delivered';
    let status = await h.call('/status', { externalOrderId: body.externalOrderId });
    assert.equal(status.status, 'in_transit'); assert.equal(status.collected, false);
    h.bookings[1].courierStatus = 'collected';
    status = await h.call('/status', { externalOrderId: body.externalOrderId }); assert.equal(status.collected, true); assert.notEqual(status.status, 'delivered');
    h.bookings[1].courierStatus = 'delivered'; status = await h.call('/status', { externalOrderId: body.externalOrderId }); assert.equal(status.status, 'delivered');
  } finally { if (previous === undefined) delete process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS; else process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS = previous; }
});
test('price increases and uncertain carrier responses require attention without automatic duplicate bookings', async () => {
  const previous = process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS; process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS = connection._id;
  try {
    const h = harness(), quote = await h.call('/rates', input);
    const body = { externalOrderId: 'order:group', quoteId: quote.quoteId, partner: 'courier_guy', service: 'Economy', maxAmount: 100, currency: 'ZAR', buyerPhone: '+27820000001' };
    h.setPrice(60); assert.equal((await h.call('/book', body)).bookingStatus, 'needs_attention'); assert.equal(h.calls(), 0);
    h.setPrice(50); h.setFail(true);
    await assert.rejects(h.call('/book', body), /reconcile/); assert.equal(h.calls(), 1);
    await h.call('/book', body); assert.equal(h.calls(), 1);
  } finally { if (previous === undefined) delete process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS; else process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS = previous; }
});
test('universal adapter signs callbacks and aggregates multiple parcels into the storefront shipment', async () => {
  let sent;
  const module = { exports: {} };
  const parcels = [{ code: 'one', courierStatus: 'delivered', trackingUrl: 'https://carrier.test/one' }, { code: 'two', courierStatus: 'collected', trackingUrl: 'https://carrier.test/two' }];
  const mocked = name => {
    if (name === 'http-status') return {};
    if (name.endsWith('/ApiError')) return Error;
    if (name.endsWith('/config')) return { env: 'test' };
    if (name.endsWith('/crypto.util')) return { decryptCredentials: () => ({ statusWebhookUrl: 'https://store.test/api/cloudship/status' }), hmacSha256Hex: (secret, body) => crypto.createHmac('sha256', secret).update(body).digest('hex') };
    if (name.endsWith('/normalize')) return {};
    if (name === 'mongoose') return { models: { MarketplaceDispatch: { findOne: async () => ({ _id: 'dispatch', state: 'booked', parcels: [{ bookingId: 'one' }, { bookingId: 'two' }] }) } } };
    if (name === '../../models') return { Booking: { find: async () => parcels } };
    if (name.endsWith('/shipmentProgress')) return { displayShipmentStatus: parcel => parcel.courierStatus === 'delivered' ? 'delivered' : 'warehouse' };
    throw new Error(name);
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../src/integrations/ecommerce/lovable.adapter.js'), 'utf8'), { require: mocked, module, fetch: async (url, request) => { sent = request; return { ok: true }; }, Date, Buffer, console });
  await module.exports.pushStatus(connection, { externalOrderId: 'order:group:parcel:0' }, { status: 'delivered' });
  const payload = JSON.parse(sent.body);
  assert.equal(payload.externalOrderId, 'order:group'); assert.equal(payload.bookingCode, 'dispatch');
  assert.equal(payload.status, 'in_transit'); assert.equal(payload.collected, true);
  const timestamp = sent.headers['x-cloudship-timestamp'];
  assert.equal(sent.headers['x-cloudship-signature'], crypto.createHmac('sha256', connection.webhookSecret).update(`${timestamp}.${sent.body}`).digest('hex'));
});
