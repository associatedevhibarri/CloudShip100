<?php
/**
 * Plugin Name: CloudShip Shipping
 * Description: Live courier rates at WooCommerce checkout. Shop owner sets pickup points, extra %, and table rates in CloudShip.
 * Version: 1.0.0
 * Requires Plugins: woocommerce
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('woocommerce_shipping_init', function () {
    if (!class_exists('WC_Shipping_Method')) {
        return;
    }

    class WC_CloudShip_Shipping_Method extends WC_Shipping_Method
    {
        public function __construct($instance_id = 0)
        {
            $this->id = 'cloudship';
            $this->instance_id = absint($instance_id);
            $this->method_title = 'CloudShip';
            $this->method_description = 'Shows live courier prices (plus your CloudShip markup) at checkout.';
            $this->supports = array('shipping-zones', 'instance-settings');
            $this->init();
        }

        public function init()
        {
            $this->instance_form_fields = array(
                'title' => array(
                    'title' => 'Title',
                    'type' => 'text',
                    'default' => 'CloudShip delivery',
                ),
                'api_url' => array(
                    'title' => 'CloudShip API URL',
                    'type' => 'text',
                    'default' => 'http://localhost:3000',
                    'description' => 'No /v1 suffix. Example: https://cloudship100.onrender.com',
                ),
                'connection_id' => array(
                    'title' => 'Connection ID',
                    'type' => 'text',
                    'description' => 'Copy from CloudShip → E-commerce → Connected stores.',
                ),
            );
            $this->init_settings();
            $this->title = $this->get_instance_option('title', 'CloudShip delivery');
        }

        public function calculate_shipping($package = array())
        {
            $api = rtrim($this->get_instance_option('api_url'), '/');
            $connection_id = trim($this->get_instance_option('connection_id'));
            if (!$api || !$connection_id) {
                return;
            }

            $dest = isset($package['destination']) ? $package['destination'] : array();
            $weight = 0;
            $items = array();
            foreach ($package['contents'] as $item) {
                $product = $item['data'];
                $qty = isset($item['quantity']) ? $item['quantity'] : 1;
                $item_kg = 0.5;
                if ($product && method_exists($product, 'get_weight')) {
                    $w = wc_get_weight($product->get_weight(), 'kg');
                    if ($w) {
                        $item_kg = floatval($w);
                    }
                }
                $weight += $item_kg * $qty;
                $items[] = array('weight' => $item_kg, 'quantity' => $qty);
            }

            $body = array(
                'destination' => array(
                    'address_1' => isset($dest['address_1']) ? $dest['address_1'] : '',
                    'address_2' => isset($dest['address_2']) ? $dest['address_2'] : '',
                    'city' => isset($dest['city']) ? $dest['city'] : '',
                    'state' => isset($dest['state']) ? $dest['state'] : '',
                    'postcode' => isset($dest['postcode']) ? $dest['postcode'] : '',
                    'country' => isset($dest['country']) ? $dest['country'] : '',
                ),
                'weightKg' => $weight > 0 ? $weight : 1,
                'items' => $items,
            );

            $response = wp_remote_post(
                $api . '/v1/webhooks/woocommerce/rates/' . rawurlencode($connection_id),
                array(
                    'timeout' => 12,
                    'headers' => array('Content-Type' => 'application/json'),
                    'body' => wp_json_encode($body),
                )
            );
            if (is_wp_error($response)) {
                return;
            }
            $quote = json_decode(wp_remote_retrieve_body($response), true);
            if (empty($quote['options']) || !is_array($quote['options'])) {
                return;
            }

            foreach ($quote['options'] as $opt) {
                $label = !empty($opt['partner']) && $opt['partner'] === 'shop_table'
                    ? $opt['service']
                    : 'CloudShip ' . $opt['partner'] . ' ' . $opt['service'];
                $this->add_rate(
                    array(
                        'id' => $this->id . '_' . sanitize_title($opt['partner'] . '_' . $opt['service']),
                        'label' => $label,
                        'cost' => floatval($opt['quotedPrice']),
                        'meta_data' => array(
                            'cloudship_quote_id' => isset($quote['quoteId']) ? $quote['quoteId'] : '',
                            'cloudship_partner' => isset($opt['partner']) ? $opt['partner'] : '',
                            'cloudship_service' => isset($opt['service']) ? $opt['service'] : '',
                        ),
                    )
                );
            }
        }
    }
});

add_filter('woocommerce_shipping_methods', function ($methods) {
    $methods['cloudship'] = 'WC_CloudShip_Shipping_Method';
    return $methods;
});
