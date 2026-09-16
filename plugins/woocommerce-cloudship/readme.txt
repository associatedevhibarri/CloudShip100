=== CloudShip – Shipping, Logistics & Delivery ===
Contributors: cloudship
Tags: shipping, logistics, delivery, woocommerce, freight
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WooCommerce shipping, freight, courier booking, parcel tracking, and international logistics. Connect your store to CloudShip.

== Description ==

CloudShip is WooCommerce shipping and logistics software for stores that need local delivery, regional freight, and international shipping.

Use CloudShip for:

* WooCommerce shipping and delivery management
* Local shipping and last-mile deliveries
* International shipping, freight, and cross-border logistics
* Parcel tracking and package management
* Courier booking (DHL, FedEx, and other carriers) after the order is placed

Install the plugin, sign in with your CloudShip seller account, and your store is connected. CloudShip creates the WooCommerce REST API keys and the order webhook for you. New WooCommerce orders appear in CloudShip so you can compare courier rates and book the shipment.

Shoppers keep the shipping method you already set at checkout (for example Flat rate or free shipping). Courier prices are for the seller in CloudShip — not a live rate table on the cart.

Built for merchants moving goods locally and across Southern Africa / SADC corridors, as well as international lanes.

This plugin does not replace your checkout shipping options with live courier rates.

== Installation ==

1. Install and activate WooCommerce.
2. Install CloudShip and activate it.
3. Go to WooCommerce → CloudShip.
4. Enter your CloudShip API URL and CloudShip email and password.
5. Click Connect store.

You need a CloudShip seller account. Pickup defaults to the WooCommerce store address (WooCommerce → Settings → General).

== Frequently Asked Questions ==

= Does this plugin add live DHL or FedEx rates at WooCommerce checkout? =

No. Checkout shipping stays yours (Flat rate, free shipping, or your existing methods). After the customer places the order, you see courier and freight prices in CloudShip and book delivery there.

= Can I track parcels after I book a courier? =

Yes. Booked shipments are managed in CloudShip with parcel / package tracking for the seller.

= Does CloudShip handle international shipping and freight? =

Yes. Use it for local delivery, regional freight, and international logistics. Courier options such as DHL and FedEx appear to the seller after checkout.

= Is my CloudShip password saved in WordPress? =

No. It is used once to connect, then discarded.

= Do I need to create WooCommerce REST keys by hand? =

No. The plugin creates the REST keys and the order webhook when you connect the store.

== Changelog ==

= 1.1.2 =
* Clarify shipping, freight, courier, and parcel-tracking wording for WordPress.org search.

= 1.1.0 =
* Connect the store from WordPress (login, REST keys, order webhook).
* Stop showing CloudShip courier rates at customer checkout.

= 1.0.0 =
* First release as a checkout shipping method.
