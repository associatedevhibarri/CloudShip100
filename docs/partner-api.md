# CloudShip Partner API

This is the contract for **developers on other projects** (Lovable apps, custom storefronts, checkout backends) who need CloudShip to quote shipping and ingest orders.

Do not send us your database dump. Send the fields below, on the endpoints below, with the auth below.

Interactive OpenAPI (local, `NODE_ENV=development` only): [http://localhost:3000/v1/docs](http://localhost:3000/v1/docs)

Merchant setup for WooCommerce / Shopify / Wix (no custom code) lives in the [root README](../README.md).

**Every CloudShip backend route** (JWT app, warehouse, drivers, ERP, public widgets): **[api.md](./api.md)**. This file is only what *other projects* must implement.

---

## Which integration you are

| Your stack | What you implement |
|---|---|
| **Lovable / Next / custom checkout** | This document. You call CloudShip. |
| **WooCommerce** | Install the CloudShip plugin. Do not re-implement these endpoints. |
| **Shopify / Wix** | Connect the store in the CloudShip dashboard, then point that platform’s webhooks at CloudShip. Payloads stay native. |

If you are building a store from scratch, you are a **universal partner**. Use `platform: lovable`.

---

## Base URL

| Environment | Base URL |
|---|---|
| Local | `http://localhost:3000` |
| Local via ngrok | `https://<your-ngrok-host>` (tunnel **port 3000**, not 5173) |
| Production | `https://api.cloudship100.com` (or the host ops gives you) |

All routes in this doc are under `/v1`. Do **not** put `/v1` on the base URL twice.

```
https://api.example.com/v1/webhooks/lovable/rates   ✅
https://api.example.com/v1/v1/webhooks/lovable/rates  ❌
```

---

## Auth

You get credentials **once**, when the merchant connects the store in CloudShip → E-commerce → **Lovable / Universal**.

| Secret | Header | Where it lives |
|---|---|---|
| `publicApiKey` (`cs_live_…`) | `x-cloudship-key` | Safe in the storefront / SDK |
| `webhookSecret` | `x-cloudship-signature` | **Server only.** Never ship this to the browser. |

Optional: `x-cloudship-connection-id` (Mongo `_id` of the store connection). Not required if the API key is valid — CloudShip looks up the store from the key.

### Production rules

- Send `x-cloudship-key` on every rates and orders call (required to find the store unless you also pass `connectionId`).
- HMAC is optional when the API key is valid. If you send `x-cloudship-signature`, it must match the raw body.
- A wrong API key is always `401`. Missing both key and signature is `401` in production; in development/test the HMAC can be omitted after the store is resolved.

```http
POST /v1/webhooks/lovable/rates
Content-Type: application/json
x-cloudship-key: cs_live_…
x-cloudship-signature: <hex HMAC-SHA256 of the raw body>
```

Node (sign the exact bytes you send, not a re-serialized object):

```js
const crypto = require('crypto');

function sign(rawBody, webhookSecret) {
  return crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
}

const body = JSON.stringify(payload);
await fetch(`${API}/v1/webhooks/lovable/orders`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-cloudship-key': publicApiKey,
    'x-cloudship-signature': sign(body, webhookSecret),
  },
  body,
});
```

`x-api-key` is accepted as an alias of `x-cloudship-key`.

---

## What we need from you

CloudShip quotes carriers from **pickup**, **dropoff**, and **weight**. Orders also need a stable shop order id and a buyer we can contact.

### Required

| Field | Type | Used for | Notes |
|---|---|---|---|
| `dropoff` | string **or** address object | rates + orders | Customer delivery address. Missing dropoff → `400 destination address required for rates`. |
| `externalOrderId` | string | orders | Your unique order id. Required. Duplicates return the existing booking (`duplicate: true`) instead of creating a second shipment. |
| `weightKg` | number `> 0` | rates + orders | Kilograms. If missing or invalid we default to **1**. Do not send grams. |

### Strongly recommended

| Field | Type | Why |
|---|---|---|
| `pickup` | string **or** address object | Origin. If omitted we use the warehouse saved on the CloudShip connection (`Merchant warehouse` as last resort). Wrong pickup = wrong price. |
| `buyerEmail` | string | Contact + receipts. SDK treats this as required. |
| `buyerPhone` | string | Carrier collection / delivery. |
| `currency` | 3-letter ISO | Default `ZAR`. |
| `cargo` | string | Short description. Default `Order {externalOrderId}`. |
| `lineItems` | array | Shown on the shop order in CloudShip. Also used to derive goods totals. |

### Address objects

A string is fine:

```text
12 Rivonia Road, Sandton, 2196, South Africa
```

Or a structured object (we concatenate non-empty parts):

```json
{
  "address1": "12 Rivonia Road",
  "address2": "Suite 4",
  "city": "Sandton",
  "province": "Gauteng",
  "postcode": "2196",
  "country": "South Africa"
}
```

Accepted aliases: `address_1` / `line1` / `addressLine1`, `zip` / `postalCode`, `state` / `region`, `countryCode`.

You may send pickup/dropoff as `origin` / `destination` / `shippingAddress` / `to`. We map them. Prefer `pickup` and `dropoff`.

### Line items

```json
{
  "name": "Cotton tee",
  "quantity": 2,
  "price": 250,
  "total": 500
}
```

Aliases: `title`, `unitPrice`. We keep at most 40 lines.

### Money (optional, but send it if you have it)

| Your field | What it becomes |
|---|---|
| `total` / `total_price` / `orderTotal` / `grandTotal` | `orderTotal` |
| `subtotal` / `itemsTotal` | `itemsTotal` |
| `shipping_total` / `shippingTotal` | `shippingTotal` |

Do **not** send CloudShip your courier contract rates. We price carriers ourselves. Shop totals are for the seller’s order screen, not for quoting.

### Weight

- Unit is **kg**.
- Shopify-style grams belong in the Shopify adapter only. On this API, `500` means 500 kg, not 0.5 kg.
- If you only have per-item weights, sum them: `Σ (item.weightKg × quantity)`.

### What we do **not** need

- Your customer password, payment card, or CMS admin token
- Carrier API keys (Courier Guy, Uber, FedEx, …) — those are CloudShip’s
- A CloudShip JWT — partner calls use the store API key, not `Authorization: Bearer`

---

## Endpoints

### 1. Quote rates at checkout

`POST /v1/webhooks/lovable/rates`

Call this when the buyer enters a shipping address. Cache nothing longer than the quote TTL (default **30 minutes**, `ECOM_QUOTE_TTL_MINUTES`).

**Request**

```json
{
  "pickup": "12 Rivonia Road, Sandton, 2196, South Africa",
  "dropoff": "1 Long Street, Cape Town, 8001, South Africa",
  "weightKg": 2,
  "currency": "ZAR"
}
```

**Response (200)** — show `options[].quotedPrice` and `options[].service` to the buyer. Treat `carrierCost` / `marginAmount` as internal; do not display them.

```json
{
  "quoteId": "qt_…",
  "expiresAt": "2026-09-19T12:00:00.000Z",
  "pickup": "12 Rivonia Road, Sandton, 2196, South Africa",
  "dropoff": "1 Long Street, Cape Town, 8001, South Africa",
  "weightKg": 2,
  "mode": "Road",
  "currency": "ZAR",
  "options": [
    {
      "partner": "courier_guy",
      "service": "Economy",
      "quotedPrice": 189.5,
      "etaHours": 48,
      "currency": "ZAR"
    }
  ],
  "selected": {
    "partner": "courier_guy",
    "service": "Economy",
    "quotedPrice": 189.5
  }
}
```

If no carrier can quote, `quoteId` is `null` and `options` is `[]`. That is success, not an error — show “no rates” in checkout.

Pass `quoteId` (and optionally `partner` / `service`) on the later order so we lock that price.

### 2. Create the shipment when the order is paid (or placed)

`POST /v1/webhooks/lovable/orders`

**Request**

```json
{
  "externalOrderId": "LOV-1001",
  "buyerEmail": "buyer@example.com",
  "buyerPhone": "+27821234567",
  "pickup": "12 Rivonia Road, Sandton, 2196, South Africa",
  "dropoff": "1 Long Street, Cape Town, 8001, South Africa",
  "weightKg": 2,
  "cargo": "Cotton tee × 2",
  "currency": "ZAR",
  "quoteId": "qt_…",
  "partner": "courier_guy",
  "service": "Economy",
  "lineItems": [{ "name": "Cotton tee", "quantity": 2, "total": 500 }],
  "orderTotal": 689.5,
  "itemsTotal": 500,
  "shippingTotal": 189.5
}
```

`quoteId` is optional. Without it we still save the shop order (`paymentStatus: awaiting`). The seller then picks a courier in CloudShip.

**Response**

| Status | Meaning |
|---|---|
| `201` | New booking |
| `200` + `duplicate: true` | Same `externalOrderId` already ingested. Safe to retry. |

```json
{
  "duplicate": false,
  "bookingId": "66f1…",
  "bookingCode": "BKG-MKT-…",
  "paymentStatus": "awaiting",
  "payment": null
}
```

Store `bookingCode` (and `bookingId` if you want). Use `bookingCode` for tracking.

### 3. Public tracking

`GET /v1/ecommerce/track/{code}`

No auth. `code` is `bookingCode` or the booking `trackingToken`. Rate-limited.

```json
{
  "code": "BKG-MKT-…",
  "status": "in_transit",
  "statusLabel": "In transit",
  "pickup": "…",
  "dropoff": "…",
  "trackingNumber": "…",
  "trackingUrl": "https://…",
  "timeline": [],
  "updatedAt": "2026-09-19T11:00:00.000Z"
}
```

### 4. Optional: status webhook we call *you*

If the store connection credentials include `statusWebhookUrl`, CloudShip POSTs shipment updates:

```json
{
  "externalOrderId": "LOV-1001",
  "bookingCode": "BKG-MKT-…",
  "status": "in_transit",
  "courierStatus": null,
  "label": null,
  "trackingNumber": "…",
  "trackingUrl": "https://…",
  "logisticsBookingRef": "…"
}
```

Your endpoint should return 2xx. Failures are logged; they do not roll back the booking.

---

## Errors

Every error body:

```json
{ "code": 401, "message": "Invalid CloudShip API key" }
```

| HTTP | When |
|---|---|
| `400` | Missing dropoff, bad weight, inactive store, ingest failed |
| `401` | Bad/missing API key or HMAC |
| `404` | Unknown `connectionId`, unknown tracking code |
| `429` | Public track rate limit |
| `500` | Unexpected server error (generic message in production) |

Retries: orders are **idempotent** on `(platform, externalOrderId)`. Rates are not — get a fresh quote after expiry.

---

## SDKs

Browser embed (public key only):

```html
<script src="https://YOUR_API/v1/public/cloudship.js"></script>
<script>
  CloudShip.init({ apiBase: 'https://YOUR_API', apiKey: 'cs_live_…' });
  const rates = await CloudShip.quote({ pickup, dropoff, weightKg: 2 });
  const order = await CloudShip.createShipment({ externalOrderId: 'LOV-1001', /* … */ });
</script>
```

Module SDK (copy into the other repo): [`frontend/src/utils/cloudshipLovableSdk.js`](../frontend/src/utils/cloudshipLovableSdk.js)

```js
const cloudship = new CloudShip({
  apiKey: process.env.VITE_CLOUDSHIP_API_KEY,
  baseUrl: process.env.VITE_CLOUDSHIP_API_URL, // no trailing /v1
});
await cloudship.getShippingRates({ pickup, dropoff, weightKg: 2 });
await cloudship.createOrder({ externalOrderId: 'LOV-1001', buyerEmail, pickup, dropoff, weightKg: 2 });
```

The module SDK currently sends the API key, not HMAC. That is enough. Add HMAC on your **server** if the order POST must not be callable from the browser.

---

## Curl smoke test

Replace the key and host.

```bash
curl -sS -X POST "$API/v1/webhooks/lovable/rates" \
  -H "Content-Type: application/json" \
  -H "x-cloudship-key: cs_live_YOUR_KEY" \
  -d '{
    "pickup": "12 Rivonia Road, Sandton, 2196, South Africa",
    "dropoff": "1 Long Street, Cape Town, 8001, South Africa",
    "weightKg": 2,
    "currency": "ZAR"
  }'
```

You should get JSON with `options` (maybe empty) — not HTML, not `401`.

---

## Checklist before you call us “integrated”

1. Merchant connected a **Lovable** store and copied `cs_live_…`.
2. Checkout pickup matches the warehouse in CloudShip → Checkout rules.
3. Rates POST returns at least one `quotedPrice` on a South Africa city-to-city test lane (see [`docs/quote-test-inputs.md`](./quote-test-inputs.md)).
4. Order POST returns `201` and a `bookingCode`.
5. Same order POST again returns `200` / `duplicate: true`.
6. `GET /v1/ecommerce/track/{bookingCode}` returns the shipment.
7. Production uses HTTPS, a real API key, and does not log `webhookSecret`.
