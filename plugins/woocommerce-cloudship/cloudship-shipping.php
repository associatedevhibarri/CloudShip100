<?php
/**
 * Plugin Name: CloudShip – Shipping, Logistics & Delivery
 * Plugin URI: https://github.com/hibarriassistantdev/CloudShip100
 * Description: WooCommerce shipping, logistics, local and international delivery, and package management. Install, sign in, and CloudShip connects your store. The seller sees courier prices in CloudShip after the customer places the order — not at checkout.
 * Version: 1.1.2
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * WC requires at least: 7.0
 * WC tested up to: 9.3
 * Author: CloudShip
 * License: GPL-2.0-or-later
 * Text Domain: cloudship-shipping-logistics-delivery
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CLOUDSHIP_PLUGIN_FILE', __FILE__);
define('CLOUDSHIP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CLOUDSHIP_PLUGIN_VERSION', '1.1.2');
define('CLOUDSHIP_DEFAULT_API_URL', 'https://cloudship100.onrender.com');

require_once CLOUDSHIP_PLUGIN_DIR . 'includes/class-cloudship-connect.php';
require_once CLOUDSHIP_PLUGIN_DIR . 'includes/class-cloudship-admin.php';
require_once CLOUDSHIP_PLUGIN_DIR . 'includes/class-cloudship-orders.php';

add_action('before_woocommerce_init', function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

register_activation_hook(__FILE__, function () {
    if (!class_exists('WooCommerce')) {
        deactivate_plugins(plugin_basename(__FILE__));
        wp_die(esc_html__('CloudShip requires WooCommerce.', 'cloudship-shipping-logistics-delivery'));
    }
    add_option('cloudship_do_activation_redirect', '1');
});

add_action('admin_init', function () {
    if (!get_option('cloudship_do_activation_redirect')) {
        return;
    }
    delete_option('cloudship_do_activation_redirect');
    if (isset($_GET['activate-multi'])) {
        return;
    }
    wp_safe_redirect(admin_url('admin.php?page=cloudship'));
    exit;
});

add_action('plugins_loaded', function () {
    if (!class_exists('WooCommerce')) {
        return;
    }
    CloudShip_Admin::init();
    CloudShip_Orders::init();
});
