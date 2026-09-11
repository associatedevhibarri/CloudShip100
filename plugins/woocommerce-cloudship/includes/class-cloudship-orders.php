<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Push new Woo orders to CloudShip immediately (does not wait for WP-Cron webhooks).
 */
class CloudShip_Orders
{
    public static function init()
    {
        add_action('woocommerce_checkout_order_processed', array(__CLASS__, 'from_id'), 20, 1);
        add_action('woocommerce_store_api_checkout_order_processed', array(__CLASS__, 'from_order'), 20, 1);
        add_action('woocommerce_thankyou', array(__CLASS__, 'from_id'), 5, 1);
        add_action('woocommerce_new_order', array(__CLASS__, 'from_new_order'), 99, 1);
    }

    public static function from_new_order($order_id)
    {
        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }
        $ship = $order->get_address('shipping');
        $bill = $order->get_address('billing');
        if (empty($ship['city']) && empty($ship['address_1']) && empty($bill['city']) && empty($bill['address_1'])) {
            return;
        }
        self::push($order);
    }

    public static function from_order($order)
    {
        if (!$order instanceof WC_Order) {
            return;
        }
        self::push($order);
    }

    public static function from_id($order_id)
    {
        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }
        self::push($order);
    }

    public static function push($order, $force = false)
    {
        if (!CloudShip_Connect::is_connected()) {
            return array('ok' => false, 'message' => 'CloudShip is not connected');
        }
        $status = $order->get_status();
        if (in_array($status, array('checkout-draft', 'auto-draft', 'trash', 'cancelled', 'failed'), true)) {
            return array('ok' => false, 'message' => 'Order status is ' . $status);
        }
        if ($order->get_meta('_cloudship_pushed') && !$force) {
            return array('ok' => true, 'message' => 'Already sent');
        }

        $state = CloudShip_Connect::get_state();
        $api_url = untrailingslashit($state['api_url']);
        $connection_id = $state['connection_id'];
        $secret = !empty($state['webhook_secret']) ? $state['webhook_secret'] : self::secret_from_webhook($state);
        if (!$api_url || !$connection_id) {
            return array('ok' => false, 'message' => 'Missing CloudShip API URL or connection id');
        }

        $payload = self::payload($order);
        $body = wp_json_encode($payload);
        $headers = array(
            'Content-Type' => 'application/json',
            'X-WC-Webhook-Topic' => 'order.created',
            'X-WC-Webhook-Source' => home_url('/'),
            'X-CloudShip-Plugin' => 'woocommerce',
        );
        if ($secret) {
            $headers['X-WC-Webhook-Signature'] = base64_encode(hash_hmac('sha256', $body, $secret, true));
        }

        $sslverify = !preg_match('#^https?://(localhost|127\.0\.0\.1)(:|/|$)#i', $api_url);
        $url = $api_url . '/v1/webhooks/woocommerce/orders?connectionId=' . rawurlencode($connection_id);

        $response = wp_remote_post(
            $url,
            array(
                'timeout' => 45,
                'headers' => $headers,
                'body' => $body,
                'sslverify' => $sslverify,
            )
        );

        if (is_wp_error($response)) {
            $message = $response->get_error_message();
            $order->add_order_note('CloudShip: could not send order — ' . $message);
            $order->save();
            return array('ok' => false, 'message' => $message);
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $detail = wp_remote_retrieve_body($response);
        if ($code < 200 || $code >= 300) {
            $short = 'HTTP ' . $code . ' ' . substr((string) $detail, 0, 300);
            if ($code === 404 && strpos((string) $detail, 'Store connection not found') !== false) {
                $short = 'This store was disconnected in CloudShip. Click Disconnect below, then Connect store again.';
            }
            $order->add_order_note('CloudShip: send failed (' . $short . ')');
            $order->save();
            return array('ok' => false, 'message' => $short);
        }

        $order->update_meta_data('_cloudship_pushed', '1');
        $order->add_order_note('CloudShip: order sent to CloudShip.');
        $order->save();
        return array('ok' => true, 'message' => 'Sent order #' . $order->get_id());
    }

    private static function secret_from_webhook($state)
    {
        if (empty($state['webhook_id']) || !class_exists('WC_Webhook')) {
            return '';
        }
        try {
            $webhook = new WC_Webhook((int) $state['webhook_id']);
            return $webhook->get_secret();
        } catch (Exception $e) {
            return '';
        }
    }

    private static function payload($order)
    {
        $line_items = array();
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            $weight = 0.5;
            if ($product && $product->get_weight()) {
                $weight = (float) wc_get_weight($product->get_weight(), 'kg');
            }
            $line_items[] = array(
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'weight' => $weight,
                'total' => $item->get_total(),
            );
        }

        return array(
            'id' => $order->get_id(),
            'number' => $order->get_order_number(),
            'currency' => $order->get_currency(),
            'total' => $order->get_total(),
            'subtotal' => $order->get_subtotal(),
            'shipping_total' => $order->get_shipping_total(),
            'billing' => $order->get_address('billing'),
            'shipping' => $order->get_address('shipping'),
            'line_items' => $line_items,
        );
    }
}
