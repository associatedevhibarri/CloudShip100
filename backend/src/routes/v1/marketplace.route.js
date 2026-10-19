const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { StoreConnection, Booking } = require('../../models');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const carriers = require('../../services/carriers');
const policy = require('../../integrations/marketplacePolicy');
const tracking = require('../../integrations/bridge/carrierTracking.service');
const { displayShipmentStatus } = require('../../integrations/utils/shipmentProgress');

const quoteSchema = new mongoose.Schema({ connection: mongoose.Schema.Types.ObjectId, input: Object, parcels: [Object], options: [Object], expiresAt: Date }, { timestamps: true });
const dispatchSchema = new mongoose.Schema({ connection: mongoose.Schema.Types.ObjectId, externalOrderId: String, quoteId: String,
  partner: String, service: String, currency: String, maxAmount: Number, parcels: [Object], state: String, reason: String, leaseUntil: Date,
}, { timestamps: true });
dispatchSchema.index({ connection: 1, externalOrderId: 1 }, { unique: true });
const Quote = mongoose.models.MarketplaceParcelQuote || mongoose.model('MarketplaceParcelQuote', quoteSchema);
const Dispatch = mongoose.models.MarketplaceDispatch || mongoose.model('MarketplaceDispatch', dispatchSchema);
const router = express.Router();

function signature(secret, timestamp, body) { return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex'); }
router.use(catchAsync(async (req, res, next) => {
  const key = req.headers['x-cloudship-key'];
  if (typeof key !== 'string') throw new ApiError(401, 'CloudShip key required.');
  const connection = await StoreConnection.findOne({ publicApiKey: key, platform: 'lovable', status: 'active' });
  const timestamp = req.headers['x-cloudship-timestamp'];
  const supplied = req.headers['x-cloudship-signature'];
  if (!connection?.webhookSecret || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now() - Number(timestamp)) > 300000 || typeof supplied !== 'string' || !/^[a-f0-9]{64}$/i.test(supplied)) throw new ApiError(401, 'Valid signed CloudShip request required.');
  const expected = signature(connection.webhookSecret, timestamp, req.rawBody || JSON.stringify(req.body));
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'))) throw new ApiError(401, 'Invalid CloudShip signature.');
  // Use authenticated raw bytes, before the generic XSS middleware modifies string values.
  if (req.rawBody) req.body = JSON.parse(req.rawBody.toString('utf8'));
  req.connectionRecord = connection;
  next();
}));

router.post('/eligibility', (req, res) => res.send(policy.eligibility(req.body.commodities)));
router.post('/connection', (req, res) => res.send({ connected: true, invoiceEnabled: invoiceEnabled(req.connectionRecord), storeName: req.connectionRecord.storeName }));
function invoiceEnabled(connection) { return String(process.env.CLOUDSHIP_INVOICE_CONNECTION_IDS || '').split(',').map(value => value.trim()).includes(String(connection._id)); }
async function quotesFor(parcels) {
  const rows = [];
  for (let offset = 0; offset < parcels.length; offset += 5) rows.push(...await Promise.all(parcels.slice(offset, offset + 5).map(parcel => carriers.quoteAll(parcel))));
  return rows.map(row => row.partners || []);
}
function expanded(input) {
  const allowed = policy.eligibility(input?.parcels?.map(parcel => parcel.commodity || {}));
  if (allowed.status !== 'eligible') throw new ApiError(400, allowed.reason);
  try { return policy.expandShipment(input); } catch (err) { throw new ApiError(400, err.message); }
}
router.post('/rates', catchAsync(async (req, res) => {
  if (!invoiceEnabled(req.connectionRecord)) throw new ApiError(503, 'CloudShip account settlement must be enabled before checkout shipping is available.');
  const parcels = expanded(req.body);
  const rows = await quotesFor(parcels);
  const options = policy.commonOptions(rows);
  if (!options.length) return res.send({ options: [], reason: 'No common carrier service is available for these parcels and route.' });
  const expiresAt = new Date(Math.min(Date.now() + 15 * 60000, ...rows.flat().filter(row => row.available).map(row => new Date(row.expiresAt).getTime()).filter(Number.isFinite)));
  const quote = await Quote.create({ connection: req.connectionRecord._id, input: req.body, parcels, options, expiresAt });
  return res.send({ quoteId: String(quote._id), expiresAt, options });
}));

async function view(dispatch) {
  const ids = dispatch.parcels.map(parcel => parcel.bookingId).filter(Boolean);
  const bookings = ids.length ? await Booking.find({ _id: { $in: ids } }) : [];
  for (const booking of bookings) { try { await tracking.refreshBookingTracking(booking); } catch (err) { /* Reconcile again on the next poll. */ } }
  const statuses = bookings.map(displayShipmentStatus);
  const complete = dispatch.state === 'booked' && statuses.length === dispatch.parcels.length;
  const status = complete && statuses.every(value => ['delivered', 'completed'].includes(value)) ? 'delivered'
    : statuses.some(value => ['warehouse', 'in_transit', 'out_for_delivery', 'delivered', 'completed'].includes(value)) ? 'in_transit' : 'pending';
  return { bookingId: String(dispatch._id), bookingCode: String(dispatch._id), externalOrderId: dispatch.externalOrderId,
    bookingStatus: dispatch.state, reason: dispatch.reason, status, collected: complete && statuses.every(value => ['warehouse', 'in_transit', 'out_for_delivery', 'delivered', 'completed'].includes(value)),
    trackingUrl: bookings.length === 1 ? bookings[0].trackingUrl : undefined,
    parcels: bookings.map(booking => ({ bookingCode: booking.code, status: displayShipmentStatus(booking), trackingUrl: booking.trackingUrl })) };
}
function ref(body) { if (typeof body.externalOrderId !== 'string' || !body.externalOrderId.length || body.externalOrderId.length > 200) throw new ApiError(400, 'Stable shipment reference required.'); return body.externalOrderId; }
router.post('/status', catchAsync(async (req, res) => {
  const dispatch = await Dispatch.findOne({ connection: req.connectionRecord._id, externalOrderId: ref(req.body) });
  if (!dispatch) throw new ApiError(404, 'Shipment not found.');
  res.send(await view(dispatch));
}));

router.post('/book', catchAsync(async (req, res) => {
  const connection = req.connectionRecord;
  if (!invoiceEnabled(connection)) throw new ApiError(403, 'CloudShip account invoicing is not enabled for this store.');
  const externalOrderId = ref(req.body);
  if (typeof req.body.buyerPhone !== 'string' || !req.body.buyerPhone.trim()) throw new ApiError(400, 'Buyer contact phone is required.');
  let dispatch = await Dispatch.findOne({ connection: connection._id, externalOrderId });
  if (!dispatch) {
    if (!mongoose.Types.ObjectId.isValid(req.body.quoteId)) throw new ApiError(400, 'Valid CloudShip quote required.');
    const quote = await Quote.findOne({ _id: req.body.quoteId, connection: connection._id });
    // Expiry may precede seller acceptance. Re-quote the immutable original shipment below.
    const option = quote?.options.find(row => row.partner === req.body.partner && row.service === req.body.service);
    if (!option || option.currency !== req.body.currency || option.quotedPrice !== req.body.maxAmount) throw new ApiError(409, 'The shipment must use its original quoted price and currency.');
    try { dispatch = await Dispatch.create({ connection: connection._id, externalOrderId, quoteId: String(quote._id), partner: option.partner,
      service: option.service, currency: option.currency, maxAmount: option.quotedPrice,
      parcels: quote.parcels.map(parcel => ({ shipment: parcel, state: 'pending' })), state: 'pending' }); }
    catch (err) { if (err.code !== 11000) throw err; dispatch = await Dispatch.findOne({ connection: connection._id, externalOrderId }); }
  }
  if (dispatch.state === 'booked' || dispatch.parcels.some(parcel => parcel.state === 'booking')) return res.send(await view(dispatch));
  const claimed = await Dispatch.findOneAndUpdate({ _id: dispatch._id, leaseUntil: { $exists: false } }, { $set: { leaseUntil: new Date(Date.now() + 120000) } }, { new: true });
  if (!claimed) throw new ApiError(409, 'Shipment booking is already being processed.');
  dispatch = claimed;
  try {
    const rows = await quotesFor(dispatch.parcels.map(parcel => parcel.shipment));
    const selected = rows.map(row => policy.choose(row, dispatch.partner, dispatch.service, dispatch.currency));
    const total = selected.reduce((sum, row, index) => sum + (dispatch.parcels[index].state === 'booked' ? Number(dispatch.parcels[index].price) : Number(row?.sellPrice || Infinity)), 0);
    if (total > dispatch.maxAmount + 0.001) { dispatch.state = 'needs_attention'; dispatch.reason = 'The selected carrier is unavailable or its price increased. Operations must arrange delivery within the paid amount; no extra buyer charge was made.'; await dispatch.save(); return res.send(await view(dispatch)); }
    for (let i = 0; i < dispatch.parcels.length; i += 1) {
      if (dispatch.parcels[i].state === 'booked') continue;
      const parcel = dispatch.parcels[i];
      const selectedQuote = selected[i];
      parcel.state = 'booking'; parcel.price = selectedQuote.sellPrice;
      dispatch.state = 'booking'; dispatch.reason = 'Booking in progress. If interrupted, operations must reconcile the carrier before retrying.';
      dispatch.markModified('parcels'); await dispatch.save();
      // Persist a stable booking before contacting the carrier so ambiguous responses are visible to ops.
      const booking = await Booking.create({ company: connection.company, code: `BKG-CMT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
        trackingToken: crypto.randomBytes(24).toString('hex'), mode: 'Road', cargo: parcel.shipment.cargo,
        pickup: parcel.shipment.pickup, dropoff: parcel.shipment.dropoff, weightKg: parcel.shipment.weightKg,
        value: selectedQuote.sellPrice, quotedPrice: selectedQuote.sellPrice, carrierCost: selectedQuote.partnerPrice,
        marginAmount: selectedQuote.marginAmount, currency: dispatch.currency, paymentStatus: 'awaiting',
        source: 'lovable', storeConnection: connection._id, externalOrderId: `${externalOrderId}:parcel:${i}`,
        selectedPartner: dispatch.partner, selectedService: dispatch.service, logisticsQuoteId: selectedQuote.quoteId,
        buyerPhone: req.body.buyerPhone, buyerEmail: req.body.buyerEmail, bookedAt: new Date() });
      parcel.bookingId = String(booking._id); dispatch.markModified('parcels'); await dispatch.save();
      const booked = await carriers.bookStoredQuote(selectedQuote.quoteId, { pickupPhone: parcel.shipment.pickupPhone, dropoffPhone: req.body.buyerPhone, dropoffName: req.body.buyerName });
      // Awaiting is deliberate: carrier service is booked on account, invoice payment is separate.
      Object.assign(booking, { logisticsBookingRef: booked.carrierShipmentId || booked.trackingNumber, carrierShipmentId: booked.carrierShipmentId,
        trackingNumber: booked.trackingNumber, trackingUrl: booked.trackingUrl, labelUrl: booked.labelUrl, partnerId: dispatch.partner,
        serviceName: dispatch.service, courierStatus: booked.courierStatus || 'collection-assigned' });
      await booking.save();
      parcel.state = 'booked'; dispatch.markModified('parcels'); await dispatch.save();
    }
    dispatch.state = 'booked'; dispatch.reason = ''; await dispatch.save();
    return res.send(await view(dispatch));
  } catch (err) {
    dispatch.state = 'needs_attention'; dispatch.reason = 'Courier booking could not be confirmed. Operations must reconcile the carrier before retrying to avoid a duplicate collection.';
    await dispatch.save();
    throw new ApiError(502, dispatch.reason);
  } finally { await Dispatch.updateOne({ _id: dispatch._id }, { $unset: { leaseUntil: 1 } }); }
}));
module.exports = router;
