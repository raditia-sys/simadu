php -r '
define(\"ROOT_DIR\", \"/home/u927936405/public_html/simadu/backend\");
require ROOT_DIR . \"/helpers.php\";
require ROOT_DIR . \"/config/database.php\";
require ROOT_DIR . \"/controllers/NotificationController.php\";

\ = Database::connect();
\ = \->query(\"SELECT * FROM user_push_subscriptions ORDER BY id DESC LIMIT 1\");
\ = \->fetch(PDO::FETCH_ASSOC);

if (\) {
    echo \"Sending test push to device sub ID: \" . \[\"id\"] . \"\n\";
    \ = new ReflectionMethod(\"NotificationController\", \"sendPushToSubscriptions\");
    \->setAccessible(true);
    \ = \->invoke(null, [\], json_encode([
        \"title\" => \"SIMADU — Uji Coba Notifikasi\",
        \"body\"  => \"Halo! Notifikasi Web Push SIMADU berhasil terhubung ke browser Anda.\",
        \"icon\"  => \"/simadu/logo_bps.png\",
        \"badge\" => \"/simadu/favicon.png\",
        \"data\"  => [\"url\" => \"/simadu/dashboard\"]
    ]));
    echo \"Delivery Status: \" . (\ > 0 ? \"SUKSES TERKIRIM KE BROWSER\" : \"GAGAL\") . \"\n\";
} else {
    echo \"Tidak ada subscription aktif di DB\n\";
}
'