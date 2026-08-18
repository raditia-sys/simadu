<?php
/**
 * AuthController — login, logout, me.
 * Session-based authentication (bukan JWT).
 */
class AuthController
{
    public static function login(): void
    {
        $body     = requestBody();
        $username = clean($body['username'] ?? '');
        $password = $body['password'] ?? '';

        if ($username === '' || $password === '') {
            respond(false, null, 'Username dan password wajib diisi.', 422);
        }

        try {
            $pdo  = Database::connect();
            $stmt = $pdo->prepare(
                'SELECT id, nama, username, password_hash, role FROM users WHERE username = ? LIMIT 1'
            );
            $stmt->execute([$username]);
            $user = $stmt->fetch();
        } catch (Throwable $e) {
            respond(false, null, 'Gagal terhubung ke database.', 500);
        }

        if (!$user || !password_verify($password, $user['password_hash'])) {
            respond(false, null, 'Username atau password salah.', 401);
        }

        // Regenerate session ID → cegah session fixation
        session_regenerate_id(true);

        $userData = [
            'id'       => (int) $user['id'],
            'nama'     => $user['nama'],
            'username' => $user['username'],
            'role'     => $user['role'],
        ];
        $_SESSION['user'] = $userData;

        logActivity(null, (int) $user['id'], 'login', 'users');

        respond(true, $userData, 'Login berhasil.');
    }

    public static function logout(): void
    {
        if (!empty($_SESSION['user'])) {
            logActivity(null, (int) $_SESSION['user']['id'], 'logout', 'users');
        }

        $_SESSION = [];

        // Hapus session cookie
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(), '', time() - 42000,
                $params['path'], $params['domain'],
                $params['secure'], $params['httponly']
            );
        }

        session_destroy();
        respond(true, null, 'Logout berhasil.');
    }

    public static function me(): void
    {
        if (empty($_SESSION['user'])) {
            respond(false, null, 'Unauthenticated.', 401);
        }
        respond(true, $_SESSION['user']);
    }
}
