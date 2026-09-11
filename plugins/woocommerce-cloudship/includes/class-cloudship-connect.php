<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Talks to CloudShip and creates Woo REST keys + the order webhook.
 */
class CloudShip_Connect
{
    const OPTION_KEY = 'cloudship_connection';

    public static function get_state()
    {
        $state = get_option(self::OPTION_KEY, array());
        if (!is_array($state)) {
            $state = array();
        }
        return wp_parse_args(
            $state,
            array(
                'api_url' => CLOUDSHIP_DEFAULT_API_URL,
                'connection_id' => '',
                'store_name' => '',
                'email' => '',
                'webhook_id' => 0,
                'webhook_secret' => '',
                'key_id' => 0,
                'connected_at' => '',
            )
        );
    }

    public static function is_connected()
    {
        $state = self::get_state();
        return !empty($state['connection_id']);
    }

    public static function connect($api_url, $email, $password)
    {
        $api_url = self::normalize_api_url($api_url);
        if (is_wp_error($api_url)) {
            return $api_url;
        }

        $login = self::request(
            $api_url,
            '/v1/auth/login',
            array(
                'email' => $email,
                'password' => $password,
            )
        );
        if (is_wp_error($login)) {
            return $login;
        }

        $token = '';
        if (!empty($login['tokens']['access']['token'])) {
            $token = $login['tokens']['access']['token'];
        }
        if (!$token) {
            return new WP_Error('cloudship_login', __('CloudShip login did not return a token. Use a seller (customer) account.', 'cloudship-shipping-logistics-delivery'));
        }

        self::cleanup_local_woo_artifacts();

        $keys = self::create_rest_key();
        if (is_wp_error($keys)) {
            return $keys;
        }

        $secret = wp_generate_password(32, false, false);
        $pickup = self::store_pickup_address();
        $store_url = home_url('/');
        $store_name = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
        if ($store_name === '') {
            $store_name = 'WooCommerce store';
        }

        $created = self::request(
            $api_url,
            '/v1/ecommerce/stores',
            array(
                'platform' => 'woocommerce',
                'storeName' => $store_name,
                'storeUrl' => $store_url,
                'webhookSecret' => $secret,
                'credentials' => array(
                    'consumerKey' => $keys['consumer_key'],
                    'consumerSecret' => $keys['consumer_secret'],
                    'storeUrl' => $store_url,
                    'pickupAddress' => $pickup,
                ),
                'settings' => array(
                    'pickupAddress' => $pickup,
                    'currency' => function_exists('get_woocommerce_currency') ? get_woocommerce_currency() : 'ZAR',
                    'defaultMode' => 'Road',
                    'paymentRules' => array(
                        'collectAtCheckout' => false,
                        'autoBookOnPaid' => true,
                    ),
                ),
            ),
            $token
        );

        if (is_wp_error($created)) {
            self::delete_rest_key($keys['key_id']);
            $code = $created->get_error_code();
            if ($code === 'cloudship_http_403') {
                return new WP_Error(
                    $code,
                    __('This CloudShip login cannot connect stores. Use a seller account (not a driver or warehouse operator).', 'cloudship-shipping-logistics-delivery')
                );
            }
            return $created;
        }

        $connection_id = !empty($created['id']) ? (string) $created['id'] : '';
        if ($connection_id === '') {
            self::delete_rest_key($keys['key_id']);
            return new WP_Error('cloudship_connect', __('CloudShip did not return a connection id.', 'cloudship-shipping-logistics-delivery'));
        }

        $delivery = $api_url . '/v1/webhooks/woocommerce/orders?connectionId=' . rawurlencode($connection_id);
        $webhook_id = self::create_order_webhook($delivery, $secret);
        if (is_wp_error($webhook_id)) {
            self::delete_rest_key($keys['key_id']);
            return $webhook_id;
        }

        update_option(
            self::OPTION_KEY,
            array(
                'api_url' => $api_url,
                'connection_id' => $connection_id,
                'store_name' => $store_name,
                'email' => $email,
                'webhook_id' => (int) $webhook_id,
                'webhook_secret' => $secret,
                'key_id' => (int) $keys['key_id'],
                'connected_at' => gmdate('c'),
            )
        );

        return true;
    }

    public static function disconnect()
    {
        self::cleanup_local_woo_artifacts();
        delete_option(self::OPTION_KEY);
        return true;
    }

    public static function normalize_api_url($url)
    {
        $url = esc_url_raw(trim((string) $url));
        $url = untrailingslashit($url);
        $url = preg_replace('#/v1$#', '', $url);
        if ($url === '' || !preg_match('#^https?://#i', $url)) {
            return new WP_Error('cloudship_api_url', __('Enter a CloudShip API URL starting with http:// or https://.', 'cloudship-shipping-logistics-delivery'));
        }
        return $url;
    }

    private static function request($api_url, $path, $body, $token = '')
    {
        $headers = array('Content-Type' => 'application/json');
        if ($token) {
            $headers['Authorization'] = 'Bearer ' . $token;
        }

        $sslverify = !preg_match('#^https?://(localhost|127\.0\.0\.1)(:|/|$)#i', $api_url);

        $response = wp_remote_post(
            $api_url . $path,
            array(
                'timeout' => 20,
                'headers' => $headers,
                'body' => wp_json_encode($body),
                'sslverify' => $sslverify,
            )
        );

        if (is_wp_error($response)) {
            return new WP_Error('cloudship_http', $response->get_error_message());
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if ($code < 200 || $code >= 300) {
            $message = __('CloudShip request failed.', 'cloudship-shipping-logistics-delivery');
            if (is_array($data) && !empty($data['message'])) {
                $message = is_array($data['message']) ? wp_json_encode($data['message']) : (string) $data['message'];
            }
            return new WP_Error('cloudship_http_' . $code, $message);
        }

        return is_array($data) ? $data : array();
    }

    private static function store_pickup_address()
    {
        if (!function_exists('WC') || !WC()->countries) {
            return get_bloginfo('name') . ' ' . home_url('/');
        }
        $countries = WC()->countries;
        $parts = array_filter(
            array(
                $countries->get_base_address(),
                $countries->get_base_address_2(),
                $countries->get_base_city(),
                $countries->get_base_state(),
                $countries->get_base_postcode(),
                $countries->get_base_country(),
            )
        );
        if (!$parts) {
            return get_bloginfo('name') . ', ' . home_url('/');
        }
        return implode(', ', $parts);
    }

    private static function create_rest_key()
    {
        global $wpdb;

        if (!function_exists('wc_rand_hash') || !function_exists('wc_api_hash')) {
            return new WP_Error('cloudship_woo', __('WooCommerce REST API helpers are missing.', 'cloudship-shipping-logistics-delivery'));
        }

        $user_id = get_current_user_id();
        if (!$user_id) {
            return new WP_Error('cloudship_user', __('You must be logged into WordPress.', 'cloudship-shipping-logistics-delivery'));
        }

        $consumer_key = 'ck_' . wc_rand_hash();
        $consumer_secret = 'cs_' . wc_rand_hash();

        $inserted = $wpdb->insert(
            $wpdb->prefix . 'woocommerce_api_keys',
            array(
                'user_id' => $user_id,
                'description' => 'CloudShip',
                'permissions' => 'read_write',
                'consumer_key' => wc_api_hash($consumer_key),
                'consumer_secret' => $consumer_secret,
                'truncated_key' => substr($consumer_key, -7),
            ),
            array('%d', '%s', '%s', '%s', '%s', '%s')
        );

        if (!$inserted) {
            return new WP_Error('cloudship_key', __('Could not create a WooCommerce REST API key.', 'cloudship-shipping-logistics-delivery'));
        }

        return array(
            'key_id' => (int) $wpdb->insert_id,
            'consumer_key' => $consumer_key,
            'consumer_secret' => $consumer_secret,
        );
    }

    private static function delete_rest_key($key_id)
    {
        global $wpdb;
        $key_id = (int) $key_id;
        if ($key_id <= 0) {
            return;
        }
        $wpdb->delete($wpdb->prefix . 'woocommerce_api_keys', array('key_id' => $key_id), array('%d'));
    }

    private static function create_order_webhook($delivery_url, $secret)
    {
        if (!class_exists('WC_Webhook')) {
            return new WP_Error('cloudship_webhook', __('WooCommerce webhooks are not available.', 'cloudship-shipping-logistics-delivery'));
        }

        $user_id = get_current_user_id();
        $webhook = new WC_Webhook();
        $webhook->set_name('CloudShip Order Created');
        $webhook->set_user_id($user_id);
        $webhook->set_topic('order.created');
        $webhook->set_delivery_url($delivery_url);
        $webhook->set_secret($secret);
        $webhook->set_status('active');
        if (method_exists($webhook, 'set_api_version')) {
            $webhook->set_api_version('wp_api_v3');
        }
        $id = $webhook->save();
        if (!$id) {
            return new WP_Error('cloudship_webhook', __('Could not create the WooCommerce order webhook.', 'cloudship-shipping-logistics-delivery'));
        }
        return (int) $id;
    }

    private static function delete_webhook($webhook_id)
    {
        $webhook_id = (int) $webhook_id;
        if ($webhook_id <= 0 || !class_exists('WC_Webhook')) {
            return;
        }
        try {
            $webhook = new WC_Webhook($webhook_id);
            if ($webhook->get_id()) {
                $webhook->delete(true);
            }
        } catch (Exception $e) {
            // Already gone.
        }
    }

    private static function delete_all_cloudship_webhooks()
    {
        $ids = array();
        if (function_exists('wc_get_webhooks')) {
            $ids = wc_get_webhooks(array('limit' => -1));
        } else {
            global $wpdb;
            $table = $wpdb->prefix . 'wc_webhooks';
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            $ids = $wpdb->get_col("SELECT webhook_id FROM {$table}");
        }
        foreach ((array) $ids as $id) {
            try {
                $webhook = new WC_Webhook((int) $id);
                $name = strtolower((string) $webhook->get_name());
                $url = strtolower((string) $webhook->get_delivery_url());
                if (
                    strpos($name, 'cloudship') !== false ||
                    strpos($url, 'cloudship') !== false ||
                    strpos($url, '/webhooks/woocommerce/orders') !== false
                ) {
                    $webhook->delete(true);
                }
            } catch (Exception $e) {
                // Skip.
            }
        }
    }

    private static function cleanup_local_woo_artifacts()
    {
        self::delete_all_cloudship_webhooks();
        $state = self::get_state();
        if (!empty($state['key_id'])) {
            self::delete_rest_key($state['key_id']);
        }
    }
}
