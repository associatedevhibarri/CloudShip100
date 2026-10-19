# Commoditopia marketplace API

All routes are POST under `/v1/marketplace`: `connection`, `eligibility`, `rates`, `book`, and `status`.

Use an active Lovable / Universal store. Every call requires `x-cloudship-key`, `x-cloudship-timestamp` (Unix milliseconds), and `x-cloudship-signature` (hex HMAC-SHA256 of `timestamp + "." + exactRawBody`, using the store webhook secret). Five-minute replay window. Keep credentials server-side.

`connection` returns store connection/account approval status. Operator environment variable `CLOUDSHIP_INVOICE_CONNECTION_IDS` is a comma-separated allowlist of store connection IDs approved for account invoicing. No rates or booking until approved. Bookings remain awaiting invoice settlement; the API does not charge the storefront buyer again.

`eligibility`: `{commodities:[{cargoForm,packagingType,specialClassifications,perishable,flammable}]}` -> status `eligible`, `unsupported`, or `incomplete`, with a reason. The policy is in `backend/src/integrations/marketplacePolicy.js`. Current specialist exclusions include bulk/tankers/containers, liquids/gases, hazardous/perishable goods, and extra loading labour. It must be updated alongside real carrier service capabilities.

`rates`: `{pickup,dropoff,pickupPhone,cargo,parcels:[{quantity,weightKg,lengthCm,widthCm,heightCm,commodity:{...}}]}` -> `{quoteId,expiresAt,options:[{partner,service,currency,quotedPrice,etaHours}]}`. Uses the supplied collection address and real carrier adapters. Maximum 20 physical parcels; one common service is quoted for the whole shipment. Carrier currencies remain unchanged. No estimates are substituted for live quotes.

`book`: `{externalOrderId,quoteId,partner,service,currency,maxAmount,buyerPhone,buyerName,buyerEmail}`. Call only after storefront payment settlement and seller acceptance. The quote is store-bound; maxAmount/currency must match it. Requotes the stored shipment even after checkout quote expiry and refuses price increases. Store connection plus externalOrderId is unique. Persists per-parcel state before booking. Repeated calls return the existing dispatch. An uncertain carrier result requires operations reconciliation; it is not automatically rebooked.

`status`: `{externalOrderId}` -> `{bookingId,bookingCode,bookingStatus,reason,status,collected,parcels:[{bookingCode,status,trackingUrl}]}`. bookingCode here identifies the multi-parcel dispatch; individual parcel codes belong to ordinary CloudShip bookings. All parcels must be collected before collected=true, and delivered before status=delivered.

Optional status callbacks use the store encrypted `statusWebhookUrl` credential. The universal adapter aggregates bundle updates and signs callbacks with the same timestamp/raw-body convention. Poll status as a reconciliation fallback.

Create the unique `(connection, externalOrderId)` index on `marketplacedispatches` before production traffic if automatic index creation is disabled. Carrier cancellation/refund and invoice settlement are manual operations; do not conflate them with a storefront buyer refund. Never reset an uncertain `booking` parcel or an interrupted dispatch lease without first checking the carrier for an existing shipment.

Tests: `node --test tests/node/marketplace.test.cjs`. Commoditopia deployment instructions are in that backend's `docs/cloudship-integration.md`.
