<?php
/**
 * SIMADU Backend — Entry Point & Router
 *
 * Semua request masuk ke sini via .htaccess rewrite.
 * Flow: session → CORS → content-type → autoload → route → dispatch
 */
declare(strict_types=1);

define('ROOT_DIR', __DIR__);

// ─── Error reporting ──────────────────────────────────────────────────────────
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ─── Session ──────────────────────────────────────────────────────────────────
session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
    'cookie_secure'   => false,   // true di production (HTTPS)
    // cookie_domain tidak diset → ikuti hostname browser (localhost:5173 via proxy)
]);

// ─── CORS — development only ──────────────────────────────────────────────────
$allowedOrigins = ['http://localhost:5173'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Content-Type ─────────────────────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');

// ─── Autoload: helpers, config, middleware, controllers ───────────────────────
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
// Composer autoload (PhpSpreadsheet dll.) — di-load lazy di dalam controller bila dibutuhkan
// require ROOT_DIR . '/vendor/autoload.php'; // jangan di-load global agar request biasa tetap ringan

// ─── Request info ─────────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip base path (/backend) agar route bisa ditulis mulai dari /api/...
$basePath = '/backend';
if (str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath));
}
$uri = '/' . trim($uri, '/');

// ─── Route Table ─────────────────────────────────────────────────────────────
// Format: 'VERB /pattern' => [ControllerClass, method]
// {id} dalam pattern akan di-capture dan dikirim ke method sebagai int
$routes = [
    // Health
    'GET /api/health' => function () {
        respond(true, ['status' => 'ok', 'version' => '1.0.0'], 'SIMADU API OK');
    },

    // Auth
    'POST /api/auth/login'  => [AuthController::class,  'login'],
    'POST /api/auth/logout' => [AuthController::class,  'logout'],
    'GET /api/me'           => [AuthController::class,  'me'],

    // ── Dashboard ────────────────────────────────────────────────────────────
    'GET /api/dashboard/summary'          => [DashboardController::class, 'summary'],
    'GET /api/dashboard/progress-wilayah' => [DashboardController::class, 'progressWilayah'],
    'GET /api/dashboard/progress-survei'  => [DashboardController::class, 'progressSurvei'],
    'GET /api/dashboard/deadline-dekat'   => [DashboardController::class, 'deadlineDekat'],
    'GET /api/dashboard/progress-trend'   => [DashboardController::class, 'progressTrend'],
    'GET /api/dashboard/years'            => [DashboardController::class, 'availableYears'],

    // ── Survei Statistik (template halaman per survei) ──────────────────────
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

    // ── Tugas Kegiatan ───────────────────────────────────────────────────────
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

    // ── Dokumen ──────────────────────────────────────────────────────────────
    'GET /api/dokumen/kategori'      => [DokumenController::class, 'kategoriList'],
    'GET /api/dokumen/download/{id}' => [DokumenController::class, 'download'],
    'GET /api/dokumen'               => [DokumenController::class, 'index'],
    'POST /api/dokumen/upload'       => [DokumenController::class, 'upload'],
    'POST /api/dokumen/link'         => [DokumenController::class, 'storeLink'],
    'PUT /api/dokumen/{id}'          => [DokumenController::class, 'update'],
    'DELETE /api/dokumen/{id}'       => [DokumenController::class, 'delete'],

    // ── Kalender & Agenda ─────────────────────────────────────────────────────
    'GET /api/kalender'         => [KalenderController::class, 'index'],
    'POST /api/kalender'        => [KalenderController::class, 'store'],
    'PUT /api/kalender/{id}'    => [KalenderController::class, 'update'],
    'DELETE /api/kalender/{id}' => [KalenderController::class, 'delete'],

    // ── Tim & Organisasi ──────────────────────────────────────────────────────
    'GET /api/tim' => [TimController::class, 'index'],

    // ── Log Aktivitas (superadmin) ────────────────────────────────────────────
    'GET /api/log' => [LogAktivitasController::class, 'index'],

    // ── Laporan Perjalanan Dinas — Wizard ─────────────────────────────────────
    // Static routes HARUS sebelum dynamic {id}
    'GET /api/perjalanan'                        => [LaporanPerjalananController::class, 'index'],
    'POST /api/perjalanan'                       => [LaporanPerjalananController::class, 'store'],
    'GET /api/perjalanan/{id}/detail'            => [LaporanPerjalananController::class, 'detail'],
    'PUT /api/perjalanan/{id}'                   => [LaporanPerjalananController::class, 'update'],
    'DELETE /api/perjalanan/{id}'                => [LaporanPerjalananController::class, 'delete'],
    'PUT /api/perjalanan/{id}/rundown'           => [LaporanPerjalananController::class, 'saveRundown'],
    'POST /api/perjalanan/{id}/foto'             => [LaporanPerjalananController::class, 'uploadFoto'],
    'DELETE /api/perjalanan/{id}/foto/{fotoId}'  => [LaporanPerjalananController::class, 'deleteFoto'],
    'POST /api/perjalanan/{id}/selesai'          => [LaporanPerjalananController::class, 'selesai'],
    'GET /api/perjalanan/{id}/download'          => [LaporanPerjalananController::class, 'download'],
];


// ─── Dispatcher ───────────────────────────────────────────────────────────────
function dispatch(string $method, string $uri, array $routes): void
{
    foreach ($routes as $routeKey => $handler) {
        [$routeMethod, $routePattern] = explode(' ', $routeKey, 2);

        if ($routeMethod !== $method) {
            continue;
        }

        // Konversi {id} → regex capture group
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

        return; // route matched — stop
    }

    // Tidak ada route yang cocok
    respond(false, null, 'Endpoint tidak ditemukan.', 404);
}

// ─── Error handler global ─────────────────────────────────────────────────────
set_exception_handler(function (Throwable $e) {
    $isDev = defined('APP_ENV') && APP_ENV === 'development';
    respond(false, $isDev ? ['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()] : null,
        'Terjadi kesalahan server.', 500);
});

define('APP_ENV', 'development');

dispatch($method, $uri, $routes);
