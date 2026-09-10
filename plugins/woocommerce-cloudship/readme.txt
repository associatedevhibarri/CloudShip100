=== CloudShip – Shipping, Logistics & Delivery ===
Contributors: cloudship
Tags: shipping, logistics, delivery, woocommerce, international shipping
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

International logistics, local shipping, deliveries, and package management for WooCommerce. Connect your store to CloudShip.

== Description ==

CloudShip is shipping, logistics, and delivery software for WooCommerce stores.

Use it for:

* Local shipping
* International shipping and international logistics
* Deliveries and delivery tracking
* Package management

Install the plugin, sign in with your CloudShip account, and your store is connected. CloudShip creates the WooCommerce REST keys and the order webhook for you.

Customers keep the shipping you already set at checkout (for example Flat rate or free shipping). After they place an order, the shipment appears in CloudShip. There you — the seller — see courier prices (DHL, FedEx, and others) plus CloudShip’s fee, and you book the delivery.

This plugin does not replace your checkout shipping options with live courier rates.

== Installation ==

1. Install and activate WooCommerce.
2. Install CloudShip and activate it.
3. Go to WooCommerce → CloudShip.
4. Enter your CloudShip API URL and CloudShip email and password.
5. Click Connect store.

You need a CloudShip seller account. Pickup defaults to the WooCommerce store address (WooCommerce → Settings → General).

== Frequently Asked Questions ==

= Does the shopper see DHL or FedEx prices? =

No. Checkout shipping stays yours. Courier prices show in CloudShip to the seller after the order is placed.

= Is my CloudShip password saved in WordPress? =

No. It is used once to connect, then discarded.

== Changelog ==

= 1.1.0 =
* Connect the store from WordPress (login, REST keys, order webhook).
* Stop showing CloudShip courier rates at customer checkout.

= 1.0.0 =
* First release as a checkout shipping method.
