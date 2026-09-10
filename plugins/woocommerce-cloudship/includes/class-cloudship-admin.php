<?php
if (!defined('ABSPATH')) {
    exit;
}

class CloudShip_Admin
{
    public static function init()
    {
        add_action('admin_menu', array(__CLASS__, 'menu'), 60);
        add_action('admin_notices', array(__CLASS__, 'notice'));
        add_action('admin_post_cloudship_connect', array(__CLASS__, 'handle_connect'));
        add_action('admin_post_cloudship_disconnect', array(__CLASS__, 'handle_disconnect'));
    }

    public static function menu()
    {
        add_submenu_page(
            'woocommerce',
            __('CloudShip', CLOUDSHIP_TD),
            __('CloudShip', CLOUDSHIP_TD),
            'manage_woocommerce',
            'cloudship',
            array(__CLASS__, 'render')
        );
    }

    public static function notice()
    {
        if (!current_user_can('manage_woocommerce')) {
            return;
        }
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        if ($screen && $screen->id === 'woocommerce_page_cloudship') {
            return;
        }
        if (CloudShip_Connect::is_connected()) {
            return;
        }
        echo '<div class="notice notice-warning"><p>';
        echo esc_html__('CloudShip is installed but not connected.', CLOUDSHIP_TD);
        echo ' <a href="' . esc_url(admin_url('admin.php?page=cloudship')) . '">';
        echo esc_html__('Connect your store', CLOUDSHIP_TD);
        echo '</a>.</p></div>';
    }

    public static function handle_connect()
    {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('You do not have permission to connect CloudShip.', CLOUDSHIP_TD));
        }
        check_admin_referer('cloudship_connect');

        $api_url = isset($_POST['api_url']) ? sanitize_text_field(wp_unslash($_POST['api_url'])) : '';
        $email = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
        $password = isset($_POST['password']) ? (string) wp_unslash($_POST['password']) : '';

        $result = CloudShip_Connect::connect($api_url, $email, $password);
        if (is_wp_error($result)) {
            set_transient(
                self::notice_key(),
                array('error' => $result->get_error_message()),
                60
            );
        } else {
            set_transient(self::notice_key(), array('connected' => '1'), 60);
        }
        wp_safe_redirect(admin_url('admin.php?page=cloudship'));
        exit;
    }

    public static function handle_disconnect()
    {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(esc_html__('You do not have permission to disconnect CloudShip.', CLOUDSHIP_TD));
        }
        check_admin_referer('cloudship_disconnect');
        CloudShip_Connect::disconnect();
        set_transient(self::notice_key(), array('disconnected' => '1'), 60);
        wp_safe_redirect(admin_url('admin.php?page=cloudship'));
        exit;
    }

    public static function render()
    {
        if (!current_user_can('manage_woocommerce')) {
            return;
        }

        $state = CloudShip_Connect::get_state();
        $connected = CloudShip_Connect::is_connected();

        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('CloudShip', CLOUDSHIP_TD) . '</h1>';
        echo '<p>' . esc_html__('Shipping, logistics, local and international delivery, and package management. Customers keep your checkout shipping (for example Flat rate). After they place an order, CloudShip shows courier prices to you — the seller.', CLOUDSHIP_TD) . '</p>';

        $flash = get_transient(self::notice_key());
        if (is_array($flash)) {
            delete_transient(self::notice_key());
            if (!empty($flash['connected'])) {
                echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('Store connected. New orders will appear in CloudShip.', CLOUDSHIP_TD) . '</p></div>';
            }
            if (!empty($flash['disconnected'])) {
                echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('Disconnected on this store. You can also disconnect it in the CloudShip dashboard.', CLOUDSHIP_TD) . '</p></div>';
            }
            if (!empty($flash['error'])) {
                echo '<div class="notice notice-error"><p>' . esc_html($flash['error']) . '</p></div>';
            }
        }

        if ($connected) {
            echo '<table class="form-table" role="presentation"><tbody>';
            self::row(__('Status', CLOUDSHIP_TD), esc_html__('Connected', CLOUDSHIP_TD));
            self::row(__('CloudShip API', CLOUDSHIP_TD), esc_html($state['api_url']));
            self::row(__('Account', CLOUDSHIP_TD), esc_html($state['email']));
            self::row(__('Connection ID', CLOUDSHIP_TD), '<code>' . esc_html($state['connection_id']) . '</code>');
            echo '</tbody></table>';
            echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" onsubmit="return confirm(\'' . esc_js(__('Disconnect CloudShip from this store?', CLOUDSHIP_TD)) . '\');">';
            echo '<input type="hidden" name="action" value="cloudship_disconnect" />';
            wp_nonce_field('cloudship_disconnect');
            submit_button(__('Disconnect', CLOUDSHIP_TD), 'delete', 'submit', false);
            echo '</form>';
            echo '</div>';
            return;
        }

        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="max-width:42rem">';
        echo '<input type="hidden" name="action" value="cloudship_connect" />';
        wp_nonce_field('cloudship_connect');
        echo '<table class="form-table" role="presentation"><tbody>';
        echo '<tr><th scope="row"><label for="cloudship_api_url">' . esc_html__('CloudShip API URL', CLOUDSHIP_TD) . '</label></th><td>';
        echo '<input name="api_url" id="cloudship_api_url" type="url" class="regular-text" required value="' . esc_attr($state['api_url'] ? $state['api_url'] : CLOUDSHIP_DEFAULT_API_URL) . '" />';
        echo '<p class="description">' . esc_html__('No /v1 at the end. Local example: http://localhost:3000', CLOUDSHIP_TD) . '</p>';
        echo '</td></tr>';
        echo '<tr><th scope="row"><label for="cloudship_email">' . esc_html__('CloudShip email', CLOUDSHIP_TD) . '</label></th><td>';
        echo '<input name="email" id="cloudship_email" type="email" class="regular-text" required value="" autocomplete="username" />';
        echo '</td></tr>';
        echo '<tr><th scope="row"><label for="cloudship_password">' . esc_html__('CloudShip password', CLOUDSHIP_TD) . '</label></th><td>';
        echo '<input name="password" id="cloudship_password" type="password" class="regular-text" required value="" autocomplete="current-password" />';
        echo '<p class="description">' . esc_html__('Used once to connect. It is not stored in WordPress.', CLOUDSHIP_TD) . '</p>';
        echo '</td></tr>';
        echo '</tbody></table>';
        submit_button(__('Connect store', CLOUDSHIP_TD));
        echo '</form>';
        echo '</div>';
    }

    private static function row($label, $value)
    {
        echo '<tr><th scope="row">' . esc_html($label) . '</th><td>' . $value . '</td></tr>';
    }

    private static function notice_key()
    {
        return 'cloudship_notice_' . get_current_user_id();
    }
}
