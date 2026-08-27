php -r '
define(\"ROOT_DIR\", \"/home/u927936405/public_html/simadu/backend\");
require ROOT_DIR . \"/helpers.php\";
require ROOT_DIR . \"/config/database.php\";
require ROOT_DIR . \"/controllers/NotificationController.php\";

\ = Database::connect();
\ = \->query(\"SELECT * FROM user_push_subscriptions WHERE id = 2\");
\ = \->fetchAll();
echo \"Found active sub id 2: \" . count(\) . \"\n\";

// Mock session
\[\"user\"] = [\"id\" => 1, \"nama\" => \"Super Administrator\"];

// Call testPush via reflection or internal method
\ = new ReflectionClass(\"NotificationController\");
\ = \->getMethod(\"sendPushToSubscriptions\");
\->setAccessible(true);
\ = json_encode([
    \"title\" => \"SIMADU — Uji Coba Berhasil\",
    \"body\"  => \"Selamat! Push Notification SIMADU kini telah terhubung 100% dengan browser Anda.\",
    \"icon\"  => \"/simadu/logo_bps.png\",
    \"badge\" => \"/simadu/favicon.png\",
    \"data\"  => [\"url\" => \"/simadu/dashboard\"]
]);
\ = \->invoke(null, \, \);
echo \"Push Sent Count: \\n\";
' 2>&1