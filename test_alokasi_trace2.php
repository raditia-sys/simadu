<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

define("ROOT_DIR", "/home/u927936405/domains/bps-batanghari.com/public_html/simadu/backend");
require ROOT_DIR . "/helpers.php";
require ROOT_DIR . "/config/database.php";
require ROOT_DIR . "/middleware/auth.php";

$pdo = Database::connect();
$sv = $pdo->query("SELECT id FROM master_survei WHERE nama_survei LIKE '%Angkutan%' LIMIT 1")->fetchColumn();
$wl = $pdo->query("SELECT id FROM master_wilayah LIMIT 1")->fetchColumn();
$pt = $pdo->query("SELECT id FROM petugas WHERE nama LIKE '%Jupri%' LIMIT 1")->fetchColumn();
$kg = $pdo->query("SELECT id FROM master_kegiatan LIMIT 1")->fetchColumn();
$pm = $pdo->query("SELECT id FROM petugas WHERE nama LIKE '%Imelda%' LIMIT 1")->fetchColumn();

// Start session before any output
session_start();
$_SESSION['user'] = ['id' => 1, 'nama' => 'Super Administrator', 'username' => 'superadmin', 'role' => 'superadmin'];

$_POST = [
    'survei_id'     => $sv,
    'wilayah_id'    => $wl,
    'petugas_id'    => $pt,
    'kegiatan_id'   => $kg,
    'tahun'         => 2026,
    'target_sampel' => 1,
    'pemeriksa_id'  => $pm,
];

require ROOT_DIR . "/controllers/TugasKegiatanController.php";
TugasKegiatanController::alokasiTahunan();
