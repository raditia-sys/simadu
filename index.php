<?php
/**
 * SIMADU Gateway & Router
 */
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

// 1. If API request -> delegate directly to backend/index.php
if (strpos($uri, '/api') !== false) {
    require __DIR__ . '/backend/index.php';
    exit;
}

// 2. Otherwise serve frontend React SPA index.html
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
exit;
