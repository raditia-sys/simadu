<?php
/**
 * SIMADU Backend â€” Entry Point & Router
 *
 * Semua request masuk ke sini via .htaccess rewrite.
 * Flow: session â†’ CORS â†’ content-type â†’ autoload â†’ route â†’ dispatch
 */
declare(strict_types=1);

define('ROOT_DIR', __DIR__);

$appConfig = file_exists(ROOT_DIR . '/config/config.php') ? require ROOT_DIR . '/config/config.php' : [];
define('APP_ENV', $appConfig['app']['env'] ?? 'development');

// â”€â”€â”€ Error reporting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// â”€â”€â”€ Session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') == 443;
session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
    'cookie_secure'   => $isHttps,
    'use_strict_mode' => true,
]);

// â”€â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// â”€â”€â”€ Content-Type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
header('Content-Type: application/json; charset=utf-8');

// â”€â”€â”€ Autoload: helpers, config, middleware, controllers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
require ROOT_DIR . '/helpers.php';
require ROOT_DIR . '/config/database.php';
require ROOT_DIR . '/middleware/auth.php';
require ROOT_DIR . '/controllers/AuthController.php';
require ROOT_DIR . '/controllers/MasterWilayahController.php';
require ROOT_DIR . '/controllers/PetugasController.php';
require ROOT_DIR . '/controllers/MasterSurveiController.php';
require ROOT_DIR . '/controllers/MasterKegiatanController.php';
require ROOT_DIR . '/controllers/TugasKegiatanController.php';
require ROOT_DIR . '/controllers/DashboardController.php';
require ROOT_DIR . '/controllers/SurveiStatistikController.php';
require ROOT_DIR . '/controllers/DokumenController.php';
require ROOT_DIR . '/controllers/KalenderController.php';
require ROOT_DIR . '/controllers/TimController.php';
require ROOT_DIR . '/controllers/LogAktivitasController.php';
require ROOT_DIR . '/controllers/LaporanPerjalananController.php';
require ROOT_DIR . '/controllers/UserController.php';
require ROOT_DIR . '/controllers/NotificationController.php';
// Composer autoload (PhpSpreadsheet dll.) â€” di-load lazy di dalam controller bila dibutuhkan
// require ROOT_DIR . '/vendor/autoload.php'; // jangan di-load global agar request biasa tetap ringan

// â”€â”€â”€ Request info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

// Strip base path (/simadu atau /backend atau /index.php) agar route bisa ditulis mulai dari /api/...
$uri = str_replace('/index.php', '', $uri);
if (str_starts_with($uri, '/simadu')) {
    $uri = substr($uri, strlen('/simadu'));
}
if (str_starts_with($uri, '/backend')) {
    $uri = substr($uri, strlen('/backend'));
}
$uri = '/' . trim($uri, '/');

// â”€â”€â”€ Route Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Format: 'VERB /pattern' => [ControllerClass, method]
// {id} dalam pattern akan di-capture dan dikirim ke method sebagai int
$routes = [
    // Health
    'GET /api/health' => function () {
        respond(true, ['status' => 'ok', 'version' => '1.0.0'], 'SIMADU API OK');
    },

    'POST /api/auth/login'   => [AuthController::class,  'login'],
    'POST /api/auth/logout'  => [AuthController::class,  'logout'],
    'GET /api/me'            => [AuthController::class,  'me'],
    'PUT /api/auth/profile'  => [AuthController::class,  'updateProfile'],

    // â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    'GET /api/dashboard/init'             => [DashboardController::class, 'init'],
    'GET /api/dashboard/summary'          => [DashboardController::class, 'summary'],
    'GET /api/dashboard/progress-wilayah' => [DashboardController::class, 'progressWilayah'],
    'GET /api/dashboard/progress-survei'  => [DashboardController::class, 'progressSurvei'],
    'GET /api/dashboard/deadline-dekat'   => [DashboardController::class, 'deadlineDekat'],
    'GET /api/dashboard/progress-trend'   => [DashboardController::class, 'progressTrend'],
    'GET /api/dashboard/years'            => [DashboardController::class, 'availableYears'],

    // â”€â”€ Survei Statistik (template halaman per survei) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    'GET /api/survei-statistik/info'     => [SurveiStatistikController::class, 'info'],
    'GET /api/survei-statistik/progress' => [SurveiStatistikController::class, 'progress'],
    'GET /api/survei-statistik/petugas'  => [SurveiStatistikController::class, 'petugas'],
    'GET /api/survei-statistik/dokumen'  => [SurveiStatistikController::class, 'dokumen'],

    // Master Wilayah (superadmin)
    'GET /api/master/wilayah'        => [MasterWilayahController::class, 'index'],
    'POST /api/master/wilayah'       => [MasterWilayahController::class, 'store'],
    'PUT /api/master/wilayah/{id}'   => [MasterWilayahController::class, 'update'],
    'DELETE /api/master/wilayah/{id}'=> [MasterWilayahController::class, 'destroy'],

    // Petugas (GET: all auth, write: superadmin)
    'GET /api/master/petugas'        => [PetugasController::class, 'index'],
    'POST /api/master/petugas'       => [PetugasController::class, 'store'],
    'PUT /api/master/petugas/{id}'   => [PetugasController::class, 'update'],
    'DELETE /api/master/petugas/{id}'=> [PetugasController::class, 'destroy'],

    // Master Survei (superadmin)
    'GET /api/master/survei'         => [MasterSurveiController::class, 'index'],
    'POST /api/master/survei'        => [MasterSurveiController::class, 'store'],
    'PUT /api/master/survei/{id}'    => [MasterSurveiController::class, 'update'],
    'DELETE /api/master/survei/{id}' => [MasterSurveiController::class, 'destroy'],

    // Master Kegiatan (GET: all auth, write: superadmin)
    'GET /api/master/kegiatan'         => [MasterKegiatanController::class, 'index'],
    'POST /api/master/kegiatan'        => [MasterKegiatanController::class, 'store'],
    'PUT /api/master/kegiatan/{id}'    => [MasterKegiatanController::class, 'update'],
    'DELETE /api/master/kegiatan/{id}' => [MasterKegiatanController::class, 'destroy'],

    // â”€â”€ Tugas Kegiatan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Urutan penting: route statis (bulk/import/export) HARUS sebelum {id}
    'GET /api/tugas/template-excel'    => [TugasKegiatanController::class, 'downloadTemplate'],
    'GET /api/tugas/export-excel'      => [TugasKegiatanController::class, 'exportExcel'],
    'POST /api/tugas/import-excel'     => [TugasKegiatanController::class, 'importExcel'],
    'DELETE /api/tugas/bulk'           => [TugasKegiatanController::class, 'bulkDestroy'],
    'PUT /api/tugas/bulk-selesai'      => [TugasKegiatanController::class, 'bulkSelesai'],
    'POST /api/tugas/alokasi-tahunan'  => [TugasKegiatanController::class, 'alokasiTahunan'],

    'GET /api/tugas'           => [TugasKegiatanController::class, 'index'],
    'POST /api/tugas'          => [TugasKegiatanController::class, 'store'],
    'GET /api/tugas/{id}'      => [TugasKegiatanController::class, 'show'],
    'PUT /api/tugas/{id}'      => [TugasKegiatanController::class, 'update'],
    'DELETE /api/tugas/{id}'   => [TugasKegiatanController::class, 'destroy'],

    // â”€â”€ Dokumen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    'GET /api/dokumen/kategori'      => [DokumenController::class, 'kategoriList'],
    'GET /api/dokumen/download/{id}' => [DokumenController::class, 'download'],
    'GET /api/dokumen'               => [DokumenController::class, 'index'],
    'POST /api/dokumen/upload'       => [DokumenController::class, 'upload'],
    'POST /api/dokumen/link'         => [DokumenController::class, 'storeLink'],
    'PUT /api/dokumen/{id}'          => [DokumenController::class, 'update'],
    'DELETE /api/dokumen/{id}'       => [DokumenController::class, 'delete'],

    // â”€â”€ Kalender & Agenda â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    'GET /api/kalender'         => [KalenderController::class, 'index'],
    'POST /api/kalender'        => [KalenderController::class, 'store'],
    'PUT /api/kalender/{id}'    => [KalenderController::class, 'update'],
    'DELETE /api/kalender/{id}' => [KalenderController::class, 'delete'],

    // â”€â”€ Tim & Organisasi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    'GET /api/tim' => [TimController::class, 'index'],

    // â”€â”€ Log Aktivitas (superadmin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    'GET /api/log' => [LogAktivitasController::class, 'index'],

    // â”€â”€ Laporan Perjalanan Dinas â€” Wizard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Static routes HARUS sebelum dynamic {id}
    'GET /api/perjalanan'                        => [LaporanPerjalananController::class, 'index'],
    'POST /api/perjalanan'                       => [LaporanPerjalananController::class, 'store'],
    'POST /api/perjalanan/batch'                 => [LaporanPerjalananController::class, 'batchStore'],
    'GET /api/perjalanan/check-merge'            => [LaporanPerjalananController::class, 'checkMerge'],
    'GET /api/perjalanan/{id}/detail'            => [LaporanPerjalananController::class, 'detail'],
    'POST /api/perjalanan/{id}/duplicate'        => [LaporanPerjalananController::class, 'duplicate'],
    'PUT /api/perjalanan/{id}'                   => [LaporanPerjalananController::class, 'update'],
    'DELETE /api/perjalanan/{id}'                => [LaporanPerjalananController::class, 'delete'],
    'PUT /api/perjalanan/{id}/rundown'           => [LaporanPerjalananController::class, 'saveRundown'],
    'POST /api/perjalanan/{id}/foto'             => [LaporanPerjalananController::class, 'uploadFoto'],
    'DELETE /api/perjalanan/{id}/foto/{fotoId}'  => [LaporanPerjalananController::class, 'deleteFoto'],
    'POST /api/perjalanan/{id}/selesai'          => [LaporanPerjalananController::class, 'selesai'],
    'GET /api/perjalanan/{id}/download'          => [LaporanPerjalananController::class, 'download'],

    // â”€â”€ Master Akun Admin (superadmin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    'GET /api/users/available-pegawai' => [UserController::class, 'availablePegawai'],
    'GET /api/users'                   => [UserController::class, 'index'],
    'POST /api/users'                  => [UserController::class, 'store'],
    'PUT /api/users/{id}/password'     => [UserController::class, 'changePassword'],
    'PUT /api/users/{id}'              => [UserController::class, 'update'],
    'DELETE /api/users/{id}'           => [UserController::class, 'destroy'],

    // â”€â”€ Web Push & Email Notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    'GET /api/notifications/vapid-key'       => [NotificationController::class, 'getVapidPublicKey'],
    'POST /api/notifications/subscribe'      => [NotificationController::class, 'subscribe'],
    'POST /api/notifications/unsubscribe'    => [NotificationController::class, 'unsubscribe'],
    'POST /api/notifications/test-push'      => [NotificationController::class, 'testPush'],
    'POST /api/notifications/test-email'     => [NotificationController::class, 'testEmail'],
    'POST /api/notifications/check-deadlines'=> [NotificationController::class, 'checkDeadlines'],
    'GET /api/notifications/check-deadlines' => [NotificationController::class, 'checkDeadlines'],
];


// â”€â”€â”€ Dispatcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function dispatch(string $method, string $uri, array $routes): void
{
    foreach ($routes as $routeKey => $handler) {
        [$routeMethod, $routePattern] = explode(' ', $routeKey, 2);

        if ($routeMethod !== $method) {
            continue;
        }

        // Konversi {id} â†’ regex capture group
        $regex = '@^' . preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $routePattern) . '$@';

        if (!preg_match($regex, $uri, $matches)) {
            continue;
        }

        // Ekstrak params (id, dll.)
        $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        $params = array_map(fn($v) => is_numeric($v) ? (int) $v : $v, $params);

        // Panggil handler
        if (is_callable($handler)) {
            $handler(...array_values($params));
        } elseif (is_array($handler) && count($handler) === 2) {
            [$class, $methodName] = $handler;
            $class::$methodName(...array_values($params));
        }

        return; // route matched â€” stop
    }

    // Tidak ada route yang cocok
    respond(false, null, 'Endpoint tidak ditemukan.', 404);
}

// â”€â”€â”€ Error handler global â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
set_exception_handler(function (Throwable $e) {
    error_log((string)$e);
    $isDev = defined('APP_ENV') && APP_ENV === 'development';
    respond(false, $isDev ? ['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()] : null,
        'Terjadi kesalahan server.', 500);
});

dispatch($method, $uri, $routes);

