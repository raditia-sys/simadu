<?php
/**
 * SIMADU — Konfigurasi Aplikasi
 * Edit credentials sesuai environment. Jangan commit file ini ke git.
 */
return [
    'db' => [
        'host'    => '127.0.0.1',
        'port'    => 3306,
        'name'    => 'simadu',
        'user'    => 'root',
        'pass'    => '',           // default Laragon: kosong
        'charset' => 'utf8mb4',
    ],
    'app' => [
        'env'  => 'development',   // 'production' di shared hosting
        'name' => 'SIMADU',
    ],
];
