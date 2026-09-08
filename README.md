# CloudShip E-Commerce Integrations Guide

This guide explains how to connect and configure external e-commerce platforms (Wix, WooCommerce, Shopify, Lovable) to flow into CloudShip for automatic shipping rate calculations and order ingestion.

## 🚀 How Webhooks Work in CloudShip
When a store connection is created via the CloudShip dashboard (`http://localhost:5173`), a unique `Connection ID` is generated for that store.

All webhook endpoints in CloudShip expect this `connectionId` either in the query params, path, or headers, so it knows which store is sending the request.

---

## 1. 🛍️ Wix Integration

### A. Creating the App in Wix Dev Center
1. Go to [Wix Dev Center](https://dev.wix.com) and create a new App.
2. Under **Permissions**, add:
   - `Orders` (Read)
   - `eCommerce Fulfillments` (Read/Write)
   - `Shipping Rates` (Read/Write)

### B. Setting up Webhooks (Order Created)
1. In the Wix Dev App, go to **Webhooks** -> **Add Webhook**.
2. Select **Wix Stores** -> **Order Created**.
3. Set the **Callback URL** to:
   ```
   https://<YOUR_NGROK_OR_PROD_URL>/v1/webhooks/wix/orders?connectionId=<YOUR_CLOUDSHIP_CONNECTION_ID>
   ```
   *(Note: Wix sends webhooks as a signed JWT token with nested data, but CloudShip's backend has a custom parser (`decodeWixJwt`) built into `app.js` and `webhook.controller.js` to automatically decode this).*

### C. Setting up Shipping Rates Extension
1. In the Wix Dev App, go to **Extensions** -> **Create Extension** -> **Ecom Shipping Rates**.
2. In the JSON Editor, set the `deploymentUri` base path to:
   ```
   https://<YOUR_NGROK_OR_PROD_URL>/v1/webhooks/wix/rates?connectionId=<YOUR_CLOUDSHIP_CONNECTION_ID>
   ```
   *(Wix will automatically append their internal paths to this base URI).*

### D. Testing on a Wix Dev Site
1. Click **Test Your App** in the top right of the Dev Center.
2. Select a free premium dev site and **Install** the app.
   > ⚠️ **CRITICAL:** Webhooks will NOT fire unless the app is actually installed on the specific site you are placing orders from!
3. Add a product (ensure it has a **weight** in kg), add it to cart, and checkout. CloudShip rates will appear, and the order will flow into the CloudShip Dashboard upon completion.

---

## 2. 🛒 WooCommerce Integration

### A. Generating Keys in WooCommerce
1. Log into WordPress Admin -> **WooCommerce** -> **Settings** -> **Advanced** -> **REST API**.
2. Click **Add key**. Give it Read/Write permissions and generate.
3. You will receive a `Consumer key (ck_...)` and `Consumer secret (cs_...)`.

### B. Connecting in CloudShip
1. Go to the CloudShip Dashboard -> **E-Commerce Integrations**.
2. Select **WooCommerce**.
3. Paste the **Store URL**, **Consumer key**, and **Consumer secret**.
4. Click **Connect**. CloudShip will securely store these and automatically register the webhooks on your WooCommerce store via API.

---

## 3. 🛍️ Shopify Integration

### A. Creating a Custom App in Shopify
1. In Shopify Admin, go to **Settings** -> **Apps and sales channels** -> **Develop apps**.
2. Create an app and click **Configure Admin API scopes**.
3. Grant `read_orders` and `write_shipping` permissions.
4. Click **Install App** -> **Reveal token once** and copy the `shpat_...` Access Token.

### B. Connecting in CloudShip
1. Go to the CloudShip Dashboard -> **E-Commerce Integrations**.
2. Select **Shopify**.
3. Paste the **Shop URL** (e.g., `mystore.myshopify.com`) and the **Access Token**.
4. Click **Connect**. CloudShip handles the webhook registration automatically.

---

## 4. 🤖 Lovable / Custom Stores Integration

### A. Connecting in CloudShip
1. Go to the CloudShip Dashboard -> **E-Commerce Integrations**.
2. Select **Lovable / Universal**.
3. Enter the Store Name and click **Connect**.
4. CloudShip will generate an API Key.

### B. Calling Webhooks Manually
From Lovable or any custom frontend, you can use the generic webhook endpoints and pass the generated API key in the headers:

**Order Created:**
```http
POST /v1/webhooks/lovable/orders
Headers:
  x-cloudship-key: <YOUR_API_KEY>
Body:
  {
     "id": "123",
     "buyerInfo": { "email": "test@test.com" },
     "shippingAddress": { "addressLine": "123 Main St", ... }
  }
```

---

## 💡 Troubleshooting & Notes for Developers

- **Wix Body Parsing:** Express `app.use(express.text({ type: 'text/plain' }))` is used specifically because Wix webhooks arrive as text/plain JWT strings.
- **HMAC Verification:** Webhooks use HMAC-SHA256 signatures. In development (when `NODE_ENV=development` or `NODE_ENV=test`), signature verification is gracefully bypassed for Wix/Shopify to allow for "test pings" during initial configuration from their developer dashboards.
- **Ngrok:** If testing locally, ensure your Ngrok URL is updated in the external platforms whenever it restarts, as Ngrok free tier changes domains on every restart.
