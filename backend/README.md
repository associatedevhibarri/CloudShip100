# CloudShip backend

Express + MongoDB API for CloudShip: quotes, bookings, e-commerce ingest, operator ERP, driver/warehouse portals.

Partner developers (other repos) should start at **[docs/partner-api.md](../docs/partner-api.md)**. **Every** backend route (JWT app + public + webhooks) is in **[docs/api.md](../docs/api.md)**. This README is how to run and change the service.

---

## Run locally

```powershell
cd backend
copy .env.example .env   # then set MONGODB_URL, JWT_SECRET, NODE_ENV=development
npm install
npm run dev
```

Listens on `PORT` (default **3000**). Frontend expects this host; do not tunnel Vite (`5173`) for webhooks.

| | |
|---|---|
| API prefix | `http://localhost:3000/v1` |
| Swagger UI | `http://localhost:3000/v1/docs` (`NODE_ENV=development` only) |
| Partner embed SDK | `http://localhost:3000/v1/public/cloudship.js` |

Tests: `npm test`. Lint: `npm run lint`.

---

## Architecture

```
routes/v1/*          HTTP surface, auth + Joi
  → controllers      thin; catchAsync
    → services       Mongo / company / store connection
    → integrations
         ecommerce/*     platform adapters (woo, shopify, wix, lovable)
         bridge/*        quotes, order ingest, payments, carrier tracking
```

Inbound shop traffic always becomes a **normalized order** (`externalOrderId`, `pickup`, `dropoff`, `weightKg`, buyer, money). Adapters are the only place platform JSON is allowed. Booking and logistics code must not switch on `shopify` field names.

```
Other project  --API key-->  POST /v1/webhooks/lovable/rates|orders
Shopify/Wix/Woo --HMAC---->  POST /v1/webhooks/<platform>/…
CloudShip UI    --JWT----->  /v1/auth, /v1/bookings, /v1/ecommerce/stores, …
```

---

## Auth model

Three different clients. Do not mix them.

| Client | Mechanism | Typical routes |
|---|---|---|
| Logged-in user (customer / operator / driver) | `Authorization: Bearer <access>` | `/v1/auth/*`, bookings, stores, ERP |
| Universal store (Lovable / custom) | `x-cloudship-key` + optional HMAC `x-cloudship-signature` | `/v1/webhooks/lovable/*` |
| Platform webhooks | Platform HMAC / JWT (Woo `X-WC-Webhook-Signature`, Shopify `X-Shopify-Hmac-Sha256`, Wix JWT) | `/v1/webhooks/{woocommerce,shopify,wix}/*` |
| Anonymous | none / rate limit | `POST /v1/pricing/quote`, `GET /v1/ecommerce/track/:code` |

JWT access TTL is `JWT_ACCESS_EXPIRATION_MINUTES` (default 30). Refresh via `POST /v1/auth/refresh-tokens`.

Store credentials are encrypted at rest (`ECOM_CREDENTIALS_SECRET`, else `JWT_SECRET`). `publicApiKey` / `webhookSecret` are returned **once** on connect (`includeSecrets: true`); list endpoints strip the webhook secret.

In **production**, unsigned partner/platform webhooks are rejected. In development/test, missing HMAC logs a warning so ngrok pings work.

---

## HTTP contract

Errors are always:

```json
{ "code": 401, "message": "Please authenticate" }
```

`stack` is included only when `NODE_ENV=development`.

Versioning is the `/v1` prefix. Additive fields are fine; renaming or removing partner fields is a breaking change — update [docs/partner-api.md](../docs/partner-api.md) in the same PR.

---

## Route map

Every method, permission, and body field: **[docs/api.md](../docs/api.md)**. Swagger: `/v1/docs`.

Mounted in `src/routes/v1/index.js`:

| Prefix | Audience |
|---|---|
| `/auth` | Register, login, refresh, verify, `/me`, operator invites |
| `/users` | Operator user CRUD |
| `/pricing` | Public `/quote`; JWT `/rates` |
| `/places` | Public autocomplete + details |
| `/leads` | Public POST; JWT list |
| `/bookings` | Customer + ops shipments |
| `/ecommerce` | Store connections, quotes, pay, public track |
| `/webhooks` | Lovable, Woo, Shopify, Wix, Stripe |
| `/companies` | Company profile |
| `/drivers` | Ops roster + driver portal `/me/*` |
| `/warehouse` | Parcels, batches, routes, zones |
| `/trips` | Ops trip board |
| `/fleet` | Assets |
| `/expenses` | Fuel / fees / salary |
| `/finance` | Summary |
| `/invoices` | All + mine |
| `/contracts` | Mine + sign |
| `/kyc-documents` | Customer uploads |
| `/payment-requests` | Mine + pay |
| `/notifications` | List, read, dismiss |
| `/promotions` | List + create |
| `/geofences` | CRUD + evaluate |
| `/dashboard` | Ops overview |
| `/weather` | Ops weather |
| `/docs` | Swagger UI (development only) |

Webhook identity: `connectionId` in path, `?connectionId=`, or `X-CloudShip-Connection-Id`. Lovable may omit it when `x-cloudship-key` matches `StoreConnection.publicApiKey`.

---

## Partner ingest (what other projects hit)

Implementation of record:

- Adapter: `src/integrations/ecommerce/lovable.adapter.js`
- HTTP: `src/routes/v1/webhooks.route.js` → `webhook.controller.js`
- Normalize: `src/integrations/ecommerce/normalize.js` (`buildNormalizedOrder`)
- Persist: `src/integrations/bridge/orderBridge.service.js` (`ingestNormalizedOrder`)
- Quote: `src/integrations/bridge/quoteBridge.service.js` (`createMarketplaceQuote`)

Idempotency key: `{platform}:order:{externalOrderId}`. Unique index on store + external order id is the backstop (`11000` → return existing booking).

If you change required partner fields, update **three** places: Joi/adapters, OpenAPI (`src/docs/partner.yml`), and `docs/partner-api.md`. If you add any other route, update `docs/api.md` and `src/docs/routes.yml` (or `node scripts/writeRoutesYml.js`).

---

## Environment

Copy `.env.example`. Minimum to boot:

- `NODE_ENV`
- `PORT`
- `MONGODB_URL`
- `JWT_SECRET`

Production also requires `SMTP_HOST` and `EMAIL_FROM`.

Carrier keys (`COURIER_GUY_*`, `UBER_DIRECT_*`, `FEDEX_*`, `DHL_*`, `DSV_*`) are optional; missing keys skip that carrier on quotes (`skipped` on the quote payload). `LOGISTICS_API_URL` empty uses the in-process carrier clients.

Do not put shop API keys in `.env`. They belong on the store connection created from the dashboard.

---

## Swagger

`src/docs/swaggerDef.js` + `src/docs/*.yml` + `@swagger` comments on route files.

After `npm run dev`, open `/v1/docs`. Partner paths are tagged **Partner**. Auth/user leftovers from the boilerplate still exist; treat Partner + Pricing as source of truth for external callers.

---

## Conventions

- New public/partner fields: document first in `docs/partner-api.md`, then code.
- Adapters throw `ApiError` with 401 for auth, 400 for payload. Do not leak HMAC secrets in messages.
- Keep `req.rawBody` (see `app.js`) — HMAC is over the raw bytes, not `JSON.stringify(req.body)`.
- Marketplace bookings start `paymentStatus: 'awaiting'`. Courier book happens after pay / seller confirm.
