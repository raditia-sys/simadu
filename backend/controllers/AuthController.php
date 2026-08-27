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
        $ip       = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

        if ($username === '' || $password === '') {
            respond(false, null, 'Username dan password wajib diisi.', 422);
        }

        try {
            $pdo = Database::connect();

            // Pastikan tabel login_attempts tersedia
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    ip_address VARCHAR(45) NOT NULL,
                    username VARCHAR(100) NOT NULL,
                    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_ip_time (ip_address, attempted_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");

            // Cek batas percobaan gagal: max 5 kali dalam 15 menit
            $stmtL = $pdo->prepare(
                'SELECT COUNT(*) FROM login_attempts WHERE ip_address = ? AND attempted_at > NOW() - INTERVAL 15 MINUTE'
            );
            $stmtL->execute([$ip]);
            $failedCount = (int)$stmtL->fetchColumn();

            if ($failedCount >= 5) {
                respond(false, null, 'Terlalu banyak percobaan login gagal. Silakan coba lagi setelah 15 menit.', 429);
            }

            $stmt = $pdo->prepare(
                'SELECT id, nama, username, password_hash, role FROM users WHERE username = ? LIMIT 1'
            );
            $stmt->execute([$username]);
            $user = $stmt->fetch();
        } catch (Throwable $e) {
            respond(false, null, 'Gagal terhubung ke database.', 500);
        }

        if (!$user || !password_verify($password, $user['password_hash'])) {
            // Catat percobaan gagal
            try {
                $stmtFail = $pdo->prepare('INSERT INTO login_attempts (ip_address, username) VALUES (?, ?)');
                $stmtFail->execute([$ip, $username]);
            } catch (Throwable) {}

            respond(false, null, 'Username atau password salah.', 401);
        }

        // Login berhasil: bersihkan riwayat percobaan gagal untuk IP ini
        try {
            $pdo->prepare('DELETE FROM login_attempts WHERE ip_address = ?')->execute([$ip]);
        } catch (Throwable) {}

        // Regenerate session ID → cegah session fixation
        session_regenerate_id(true);

        $userData = [
            'id'       => (int) $user['id'],
            'nama'     => $user['nama'],
            'username' => $user['username'],
            'email'    => $user['email'] ?? null,
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

        try {
            $pdo = Database::connect();
            $stmt = $pdo->prepare('
                SELECT u.id, u.nama, u.username, 
                       COALESCE(NULLIF(u.email, ""), NULLIF(p.kontak, "")) AS email, 
                       u.role 
                FROM users u 
                LEFT JOIN petugas p ON p.id = u.petugas_id 
                WHERE u.id = ?
            ');
            $stmt->execute([(int)$_SESSION['user']['id']]);
            $u = $stmt->fetch();
            if ($u) {
                $_SESSION['user'] = [
                    'id'       => (int) $u['id'],
                    'nama'     => $u['nama'],
                    'username' => $u['username'],
                    'email'    => $u['email'] ?? null,
                    'role'     => $u['role'],
                ];
            }
        } catch (Throwable $e) {}

        respond(true, $_SESSION['user']);
    }

    /** Update profil akun sendiri (Superadmin & Admin) */
    public static function updateProfile(): void
    {
        $currentUser = requireAuth();
        $body = requestBody();

        validateRequired($body, ['nama' => 'Nama Lengkap']);

        $nama     = trim($body['nama']);
        $email    = !empty($body['email']) ? trim($body['email']) : null;
        $password = !empty($body['password']) ? $body['password'] : null;

        if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(false, null, 'Format alamat email tidak valid.', 422);
        }

        if ($password && strlen($password) < 6) {
            respond(false, null, 'Password baru minimal 6 karakter.', 422);
        }

        $pdo = Database::connect();

        if ($password) {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare('UPDATE users SET nama = ?, email = ?, password_hash = ?, plain_password = ?, updated_at = NOW() WHERE id = ?');
            $stmt->execute([$nama, $email, $hash, $password, (int)$currentUser['id']]);
        } else {
            $stmt = $pdo->prepare('UPDATE users SET nama = ?, email = ?, updated_at = NOW() WHERE id = ?');
            $stmt->execute([$nama, $email, (int)$currentUser['id']]);
        }

        $_SESSION['user']['nama']  = $nama;
        $_SESSION['user']['email'] = $email;

        logActivity($pdo, (int)$currentUser['id'], 'update_profile', 'users', (int)$currentUser['id'], "Update profil akun: {$currentUser['username']}");

        respond(true, [
            'id'       => (int)$currentUser['id'],
            'nama'     => $nama,
            'username' => $currentUser['username'],
            'email'    => $email,
            'role'     => $currentUser['role'],
        ], 'Profil akun berhasil diperbarui.');
    }
}
