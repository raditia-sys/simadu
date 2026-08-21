<?php
/**
 * SIMADU — Konfigurasi Aplikasi (Template untuk Hosting / Server)
 * Salin file ini menjadi 'config.php' lalu sesuaikan kredensial hosting.
 */
return [
    'db' => [
        'host'    => 'localhost',       // Biasa 'localhost' atau '127.0.0.1' di cPanel
        'port'    => 3306,
        'name'    => 'u123456_simadu',  // Nama database di hosting (contoh: cpaneluser_simadu)
        'user'    => 'u123456_simadu',  // User database di hosting
        'pass'    => 'PasswordKuatDatabase123!', // Password user database
        'charset' => 'utf8mb4',
    ],
    'app' => [
        'env'  => 'production',         // 'production' saat hosting, 'development' di lokal
        'name' => 'SIMADU',
    ],
];