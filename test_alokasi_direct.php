<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI']    = '/simadu/api/tugas/alokasi-tahunan';
$_SERVER['HTTP_HOST']      = 'bps-batanghari.com';
$_SERVER['REMOTE_ADDR']    = '127.0.0.1';

define('ROOT_DIR', __DIR__ . '/backend');
require ROOT_DIR . '/helpers.php';
require ROOT_DIR . '/config/database.php';
$pdo = Database::connect();

$sv = $pdo->query("SELECT id FROM master_survei LIMIT 1")->fetchColumn();
$wl = $pdo->query("SELECT id FROM master_wilayah LIMIT 1")->fetchColumn();
$pt = $pdo->query("SELECT id FROM petugas LIMIT 1")->fetchColumn();
$kg = $pdo->query("SELECT id FROM master_kegiatan LIMIT 1")->fetchColumn();

session_start();
$_SESSION['user'] = ['id' => 1, 'nama' => 'Super Administrator', 'username' => 'superadmin', 'role' => 'superadmin'];

$_POST = [
    'survei_id'     => (int)$sv,
    'wilayah_id'    => (int)$wl,
    'petugas_id'    => (int)$pt,
    'kegiatan_id'   => (int)$kg,
    'tahun'         => 2026,
    'target_sampel' => 1,
    'pemeriksa_id'  => null,
];

require __DIR__ . '/index.php';
