<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

define('ROOT_DIR', '/home/u927936405/public_html/simadu/backend');
require ROOT_DIR . '/helpers.php';
require ROOT_DIR . '/config/database.php';
require ROOT_DIR . '/controllers/NotificationController.php';

$_GET['key'] = 'bps1504_cron_key';

try {
    NotificationController::checkDeadlines();
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "FILE: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "TRACE:\n" . $e->getTraceAsString() . "\n";
}
