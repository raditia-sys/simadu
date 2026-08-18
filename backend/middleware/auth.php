<?php
/**
 * Auth Middleware — guard functions untuk proteksi endpoint.
 */

/**
 * Pastikan request datang dari user yang sudah login.
 * Return user array dari session.
 */
function requireAuth(): array
{
    if (empty($_SESSION['user'])) {
        respond(false, null, 'Sesi telah berakhir. Silakan login kembali.', 401);
    }
    return $_SESSION['user'];
}

/**
 * Pastikan user sudah login DAN memiliki salah satu role yang diizinkan.
 * @param string ...$roles  role yang diizinkan ('superadmin', 'admin')
 */
function requireRole(string ...$roles): array
{
    $user = requireAuth();
    if (!in_array($user['role'], $roles, true)) {
        respond(false, null, 'Anda tidak memiliki akses ke fitur ini.', 403);
    }
    return $user;
}
