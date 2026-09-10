# CloudShip E-Commerce Integrations Guide

This comprehensive guide explains how to connect, configure, and test external e-commerce platforms (**WooCommerce**, **Shopify**, **Wix**, and **Lovable / Custom Web Apps**) to flow seamlessly into CloudShip for automatic shipping rate calculations and order ingestion.

---

## 🚀 Core Architecture: How Webhooks Work in CloudShip

When a store connection is created via the CloudShip Dashboard (`http://localhost:5173`), a unique **`Connection ID`** (MongoDB `_id`) is generated for that store.

All webhook endpoints in CloudShip expect this `connectionId` either in the query params, path, or headers, so it knows which store account is receiving the request.

---

## 1. 🛒 WooCommerce Integration

Install the plugin in WordPress. The shop owner signs in once; the plugin creates REST keys and the order webhook. Checkout shipping stays the seller’s (Flat rate / free). Courier prices show to the seller in CloudShip after **Place Order**.

1. Copy `plugins/woocommerce-cloudship` into `wp-content/plugins/` and activate **CloudShip**.
2. WooCommerce ➔ **CloudShip**.
3. API URL = your CloudShip backend with no `/v1` (example `http://localhost:3000` or `https://cloudship100.onrender.com`).
4. Enter the CloudShip seller email and password ➔ **Connect store**.
5. Place a test order. Confirm it in CloudShip ➔ E-commerce ➔ Orders.

Pickup defaults to WooCommerce ➔ Settings ➔ General. Edit warehouses later in CloudShip.

---

## 2. 🛍️ Shopify Integration

### A. Creating a Custom App in Shopify
1. In Shopify Admin, go to **Settings** ➔ **Apps and sales channels** ➔ **Develop apps**.
2. Click **Create an app** (Name: `CloudShip Integration`).
3. Click **Configure Admin API scopes** and grant:
   - `read_orders` / `write_orders`
   - `read_shipping` / `write_shipping`
   - `write_fulfillments`
4. Click **Save** ➔ **Install app** ➔ **Reveal token once** under Admin API access token.
5. Copy your token: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.

### B. Connecting in CloudShip
1. Go to CloudShip Dashboard ➔ **E-Commerce Integrations** ➔ **Shopify**.
2. Fill in: **Shop Domain** (`mystore.myshopify.com`) + **Access Token** (`shpat_...`) + **Pickup Address**.
3. Click **Connect** to obtain your **Connection ID**.

### C. Setting up Shopify Webhooks
1. In Shopify Admin, go to **Settings** ➔ **Notifications** ➔ **Webhooks** ➔ Click **Create webhook**.
2. Configure:
   - **Event**: `Order creation`
   - **Format**: `JSON`
   - **URL**: 
     ```text
     https://<YOUR_NGROK_OR_PROD_DOMAIN>/v1/webhooks/shopify/orders?connectionId=<YOUR_CONNECTION_ID>
     ```
3. Click **Save**. Use **Send test notification** to verify.

---

## 3. 🛍️ Wix Integration

### A. Creating the App in Wix Dev Center
1. Go to [Wix Dev Center](https://dev.wix.com) and create a new App.
2. Under **Permissions**, grant:
   - `Orders` (Read)
   - `eCommerce Fulfillments` (Read/Write)
   - `Shipping Rates` (Read/Write)

### B. Setting up Webhooks & Carrier Extensions
1. In Wix Dev App, go to **Webhooks** ➔ **Add Webhook** ➔ Select **Wix Stores** ➔ **Order Created**.
2. Set **Callback URL** to:
   ```text
   https://<YOUR_NGROK_OR_PROD_DOMAIN>/v1/webhooks/wix/orders?connectionId=<YOUR_CONNECTION_ID>
   ```
3. Go to **Extensions** ➔ **Create Extension** ➔ **Ecom Shipping Rates**. Set `deploymentUri` base path to:
   ```text
   https://<YOUR_NGROK_OR_PROD_DOMAIN>/v1/webhooks/wix/rates?connectionId=<YOUR_CLOUDSHIP_CONNECTION_ID>
   ```
4. Install the app on your test site and connect in CloudShip.

---

## 4. 🤖 Lovable / Custom Web Apps Integration

### A. Connecting in CloudShip
1. Go to CloudShip Dashboard ➔ **E-Commerce Integrations** ➔ **Lovable / Universal**.
2. Enter your **Store Name** and **Pickup Address** ➔ Click **Connect**.
3. Save your generated credentials (shown once):
   - `publicApiKey`: `cs_live_...`
   - `webhookSecret`: `...`

### B. Using the Senior SDK (`src/utils/cloudshipLovableSdk.js`)
Copy [**`cloudshipLovableSdk.js`**](file:///d:/Hibarri/CloudShip100/frontend/src/utils/cloudshipLovableSdk.js) into your Lovable app project.

```javascript
import { CloudShip } from './utils/cloudshipLovableSdk';

// Automatically uses VITE_CLOUDSHIP_API_KEY & VITE_CLOUDSHIP_API_URL from .env
const cloudship = new CloudShip();

// 1. Fetch live rates at checkout
const rates = await cloudship.getShippingRates({
  pickup: 'Cape Town Warehouse',
  dropoff: customerAddress,
  weightKg: 2.0,
});

// 2. Submit order upon purchase
const booking = await cloudship.createOrder({
  externalOrderId: 'LOV-1001',
  buyerEmail: customerEmail,
  pickup: 'Cape Town Warehouse',
  dropoff: customerAddress,
  weightKg: 2.0,
  cargo: 'Lovable Store Product',
});
```

---

## 💡 Troubleshooting & Senior Notes

- **HMAC Signatures in Dev Mode**: HMAC signature checks for WooCommerce, Shopify, Wix, and Lovable log warnings in `NODE_ENV=development` or `NODE_ENV=test` to allow effortless Ngrok test pings during setup.
- **Ngrok Host Updates**: When Ngrok restarts, update your `.env` or webhook URLs with the new active forwarding domain (inspect requests via `http://127.0.0.1:4040`).
- **Production Checklist**: When deploying to production:
  - Enforce `https://` on all webhook endpoints.
  - Set `NODE_ENV=production` to strictly enforce HMAC signature validation.
  - Ensure WordPress permalinks are set to `Post name` (required for WooCommerce REST API).
