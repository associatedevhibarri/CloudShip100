# CloudShip API — all routes

Base URL: `{host}/v1` (local `http://localhost:3000/v1`).

| Who | Auth |
|---|---|
| CloudShip app (customer, operator, driver) | `Authorization: Bearer {accessToken}` |
| Lovable / custom stores | `x-cloudship-key` — **[partner-api.md](./partner-api.md)** |
| Woo / Shopify / Wix | Platform HMAC + `connectionId` |
| Public widgets | none (rate-limited) |

Errors: `{ "code": 401, "message": "…" }`. JWT 401 = not logged in. 403 = logged in, wrong permission.

Interactive: `http://localhost:3000/v1/docs` (`NODE_ENV=development`).

---

## Public (no JWT)

| Method | Path | Body / query | Notes |
|---|---|---|---|
| POST | `/pricing/quote` | **pickup**, **dropoff**, **weightKg**; optional mode, cargo, dims, declaredValue, pickupDate | Homepage quote. Rate-limited. |
| GET | `/places/autocomplete` | query `q`, `sessionToken`, `country` | Google Places. Rate-limited. |
| GET | `/places/details` | query **placeId**, `sessionToken` | Rate-limited. |
| POST | `/leads` | **name**, **email**, **company**, **message** | Landing form. Rate-limited. |
| GET | `/ecommerce/track/{code}` | path **code** (bookingCode or trackingToken) | Tracking widget. Rate-limited. |
| POST | `/ecommerce/payments/{paymentIntentId}/confirm` | path **paymentIntentId** | Completes pay + book. Intent id is the secret. |
| GET | `/docs` | — | Swagger UI. **Development only.** |
| GET | `/public/cloudship.js` | — | Partner embed SDK (static). |

---

## Auth

| Method | Path | Auth | Body / query |
|---|---|---|---|
| POST | `/auth/register` | — | **name**, **email**, **password**; optional `role` `user`\|`customer`\|`driver`; `companyName` required if customer |
| POST | `/auth/login` | — | **email**, **password** |
| POST | `/auth/logout` | — | **refreshToken** |
| POST | `/auth/refresh-tokens` | — | **refreshToken** |
| POST | `/auth/forgot-password` | — | **email** |
| POST | `/auth/reset-password` | — | query **token**; body **password** |
| POST | `/auth/verify-email` | — | query **token** |
| POST | `/auth/resend-verification-email` | — | **email** |
| POST | `/auth/send-verification-email` | JWT | — |
| GET | `/auth/me` | JWT | — |
| POST | `/auth/ops/invite` | `manageUsers` | **name**, **email** |
| POST | `/auth/ops/{userId}/resend-invite` | `manageUsers` | — |
| POST | `/auth/ops/{userId}/verify-email` | `manageUsers` | — |
| POST | `/auth/customers/{userId}/verify-email` | `manageUsers` | — |
| POST | `/auth/customers/{userId}/resend-verify` | `manageUsers` | — |

---

## Users (operators)

| Method | Path | Auth | Body / query |
|---|---|---|---|
| POST | `/users` | `manageUsers` | **name**, **email**, **password**, **role** `user`\|`admin`\|`operator` |
| GET | `/users` | `getUsers` | query name, role, sortBy, limit, page |
| GET | `/users/{userId}` | `getUsers` | — |
| PATCH | `/users/{userId}` | `manageUsers` | email, password, name (min 1) |
| DELETE | `/users/{userId}` | `manageUsers` | — |

---

## Bookings (customer shipments)

| Method | Path | Auth | Body / query |
|---|---|---|---|
| GET | `/bookings/mine` | `viewOwnBookings` | — |
| POST | `/bookings/mine` | `manageOwnBookings` | **pickup**, **dropoff**, **cargo**, **mode** `Road`\|`Air`\|`Maritime`\|`Rail`; **weightKg or quoteId** |
| GET | `/bookings` | `viewAllBookings` | query status `pending`\|`in_transit`\|`completed`\|`history` |
| POST | `/bookings` | `manageOwnBookings` | same as `/mine` POST |

---

## Pricing (operator rate card)

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/pricing/rates` | `managePricing` | — |
| PUT | `/pricing/rates` | `managePricing` | **rates[]** each: **mode**, **baseFee**, **perKm**, **perKg**; optional active. 1–4 rows. |

Public quote is under Public above.

---

## Ecommerce (JWT store admin)

Partner checkout calls are under Webhooks / [partner-api.md](./partner-api.md).

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/ecommerce/stores` | `viewOwnEcommerce` | — |
| POST | `/ecommerce/stores` | `manageOwnEcommerce` | **platform** `woocommerce`\|`shopify`\|`wix`\|`lovable`, **storeName**, **credentials** object; optional storeUrl, webhookSecret, settings |
| PATCH | `/ecommerce/stores/{connectionId}` | `manageOwnEcommerce` | storeName, storeUrl, status `active`\|`paused`\|`disconnected`, credentials, webhookSecret, settings |
| DELETE | `/ecommerce/stores/{connectionId}` | `manageOwnEcommerce` | disconnects (status disconnected) |
| POST | `/ecommerce/stores/{connectionId}/orders` | `manageOwnEcommerce` | platform order body (manual ingest) |
| POST | `/ecommerce/quotes` | `manageOwnEcommerce` | **pickup**, **dropoff**, **weightKg**; optional connectionId, mode, currency, preferredPartner, lockPickup |
| GET | `/ecommerce/payments/config` | `manageOwnPayments` | publishable key / mock flag |
| POST | `/ecommerce/bookings/{bookingId}/pay` | `manageOwnPayments` | optional quoteId, partner, service |

---

## Webhooks (stores + Stripe)

Identify the store with path `/{connectionId}`, `?connectionId=`, or `X-CloudShip-Connection-Id`. Lovable can use `x-cloudship-key` only.

| Method | Path | Auth |
|---|---|---|
| POST | `/webhooks/lovable/rates` | `x-cloudship-key` (+ optional HMAC). See partner-api. |
| POST | `/webhooks/lovable/orders` | same |
| POST | `/webhooks/woocommerce/orders` | Woo HMAC `X-WC-Webhook-Signature` |
| POST | `/webhooks/woocommerce/orders/{connectionId}` | same |
| POST | `/webhooks/woocommerce/rates` | same |
| POST | `/webhooks/woocommerce/rates/{connectionId}` | same |
| POST | `/webhooks/shopify/orders` | `X-Shopify-Hmac-Sha256` |
| POST | `/webhooks/shopify/orders/{connectionId}` | same |
| POST | `/webhooks/shopify/rates` | CarrierService JSON |
| POST | `/webhooks/shopify/rates/{connectionId}` | same |
| POST | `/webhooks/wix/orders` | Wix JWT or HMAC |
| POST | `/webhooks/wix/orders/{connectionId}` | same |
| POST | `/webhooks/wix/rates` | Shipping rates plugin |
| POST | `/webhooks/wix/rates/{connectionId}` | same |
| POST | `/webhooks/stripe` | `Stripe-Signature`; event `payment_intent.succeeded` |

---

## Company

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/companies` | `viewAllCompanies` | — |
| GET | `/companies/me` | `viewOwnCompany` | — |
| PATCH | `/companies/me` | `manageOwnCompany` | contact, phone, tier `Standard`\|`Growth`\|`Enterprise` |

---

## Drivers — operator

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/drivers` | `viewAllDrivers` | roster |
| GET | `/drivers/locations` | `viewAllDrivers` | live GPS |
| PATCH | `/drivers/{employeeId}/approval` | `viewAllDrivers` | **approvalStatus** `pending`\|`active`\|`rejected` |

## Drivers — driver portal (`auth()` + driver role)

| Method | Path | Body / query |
|---|---|---|
| POST | `/drivers/me/location` | **lat**, **lng**; optional heading, speed, accuracy, at |
| GET | `/drivers/me/dashboard` | — |
| GET | `/drivers/me/profile` | — |
| PATCH | `/drivers/me/profile` | contactEmail, phone, address, nationalId, licenseClass, licenceExpiry, emergency*, assignedVehicle, restrictions (min 1) |
| GET | `/drivers/me/trips` | query bucket `all`\|`active`\|`upcoming`\|`completed`\|`starting_soon`\|`in_progress`\|`ending_soon` |
| GET | `/drivers/me/parcels` | query status `assigned`\|`picked_up`\|`in_transit`\|`delivered`\|`cancelled` |
| PATCH | `/drivers/me/parcels/{parcelCode}/status` | **status** `picked_up`\|`in_transit`\|`delivered`; if delivered: **recipientName**, **signatureName** |
| GET | `/drivers/me/damage-logs` | — |
| POST | `/drivers/me/damage-logs` | multipart `photo`; **severity** `minor`\|`major`, **description** (min 5); optional parcelId, tripId, location |
| GET | `/drivers/me/history` | — |
| POST | `/drivers/me/documents` | multipart `document`; **type** `national_id`\|`driving_license`\|`other` |
| DELETE | `/drivers/me/documents/{documentId}` | — |

---

## Warehouse (`manageWarehouse`)

| Method | Path | Body |
|---|---|---|
| GET | `/warehouse` | snapshot |
| GET | `/warehouse/drivers` | registered drivers |
| POST | `/warehouse/parcels/auto-assign` | — |
| POST | `/warehouse/parcels/{parcelId}/receive` | optional lat, lng |
| POST | `/warehouse/parcels/{parcelId}/label` | optional lat, lng |
| POST | `/warehouse/parcels/{parcelId}/batch` | **batchId** |
| POST | `/warehouse/parcels/{parcelId}/assign` | employeeId, fleetType, truck, driver, partner |
| POST | `/warehouse/parcels/{parcelId}/dispatch` | optional lat, lng |
| POST | `/warehouse/batches` | **name**, **warehouse**, **destination** |
| POST | `/warehouse/batches/{batchId}/close` | — |
| POST | `/warehouse/routes/auto-assign` | — |
| POST | `/warehouse/routes/{routeId}/optimize` | — |
| POST | `/warehouse/zones/evaluate` | **lat**, **lng** |
| POST | `/warehouse/zones/{zoneId}/toggle` | **active** boolean |

---

## Trips (`viewAllTrips`)

| Method | Path | Body / query |
|---|---|---|
| GET | `/trips` | query status, mode `road`\|`air`\|`maritime`\|`rail` |
| POST | `/trips` | **employeeId**, **cargo**, **pickup**, **dropoff**; optional vehicle, mode, distanceKm, clientOrderId, status |
| PATCH | `/trips/{tripId}` | vehicle, cargo, pickup, dropoff, mode, distanceKm, onTime, status (min 1) |
| PATCH | `/trips/{tripId}/reassign` | **employeeId** |
| POST | `/trips/{tripId}/cancel` | — |

---

## Fleet (`manageFleet`)

| Method | Path | Body / query |
|---|---|---|
| GET | `/fleet` | query type `yard`\|`vehicle`\|`trailer`\|`equipment`\|`check_in`\|`rail_siding`\|`locomotive`\|`rail_yard` |
| POST | `/fleet` | **type** (same enum); optional code, name, status; extra fields allowed |

---

## Expenses (`manageExpenses`)

| Method | Path | Body / query |
|---|---|---|
| GET | `/expenses` | query kind `fuel`\|`yard_fee`\|`airport_fee`\|`salary` |
| POST | `/expenses` | **kind**; optional date, period, asset, liters, cost, amount, location, yard, airport, description, person, role |

---

## Finance / invoices / contracts / KYC / payments

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/finance` | `viewAllInvoices` | summary |
| GET | `/invoices` | `viewAllInvoices` | all |
| GET | `/invoices/mine` | `viewOwnInvoices` | mine |
| GET | `/contracts/mine` | `viewOwnContracts` | — |
| PATCH | `/contracts/{contractId}/sign` | `manageOwnContracts` | — |
| GET | `/kyc-documents/mine` | `viewOwnDocuments` | — |
| POST | `/kyc-documents/mine` | `manageOwnDocuments` | multipart `file`; **type**; optional expiresAt |
| GET | `/payment-requests/mine` | `viewOwnPayments` | — |
| PATCH | `/payment-requests/{paymentRequestId}/pay` | `manageOwnPayments` | — |

---

## Notifications

| Method | Path | Auth |
|---|---|---|
| GET | `/notifications` | `viewAllNotifications` |
| GET | `/notifications/mine` | `viewOwnNotifications` |
| PATCH | `/notifications/{notificationId}/read` | JWT |
| DELETE | `/notifications/{notificationId}` | JWT |

---

## Promotions

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/promotions` | `viewPromotions` | — |
| POST | `/promotions` | `managePromotions` | **title**, **body**; optional tag |

---

## Geofences (`manageGeofences`)

| Method | Path | Body |
|---|---|---|
| GET | `/geofences` | — |
| POST | `/geofences` | **name**, **scope** `country`\|`province`\|`radius`, **region**, **rule**; optional radiusKm, exclusions, lat, lng, active, id |
| POST | `/geofences/evaluate` | **lat**, **lng** |
| PATCH | `/geofences/{geofenceId}` | any geofence field (min 1) |
| DELETE | `/geofences/{geofenceId}` | — |

---

## Ops dashboard

| Method | Path | Auth |
|---|---|---|
| GET | `/dashboard` | `viewOpsDashboard` |
| GET | `/weather` | `viewOpsDashboard` |
| GET | `/leads` | `manageLeads` |

---

## Count

Every route mounted in `backend/src/routes/v1/index.js` is listed above. If you add a route, add it here and in `backend/src/docs/routes.yml` in the same PR.
