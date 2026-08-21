<?php
/**
 * UserController — CRUD akun admin & manajemen pengguna.
 * Hak akses: Superadmin only
 */
class UserController
{
    /** List semua user + info pegawai */
    public static function index(): void
    {
        requireRole('superadmin');
        $pdo = Database::connect();

        $stmt = $pdo->query("
            SELECT
                u.id, u.petugas_id, u.username, u.nama, u.email, u.plain_password, u.role, u.created_at, u.updated_at,
                p.nama AS nama_pegawai, p.nip_atau_kode_mitra AS nip, p.jabatan, p.kontak
            FROM users u
            LEFT JOIN petugas p ON p.id = u.petugas_id
            ORDER BY u.id ASC
        ");

        respond(true, $stmt->fetchAll());
    }

    /** List pegawai yang belum memiliki akun admin (atau milik user_id saat edit) */
    public static function availablePegawai(): void
    {
        requireRole('superadmin');
        $pdo = Database::connect();
        $userId = query('user_id');

        if ($userId) {
            $stmt = $pdo->prepare("
                SELECT id, nama, nip_atau_kode_mitra AS nip, jabatan, kontak AS email
                FROM petugas
                WHERE tipe = 'pegawai'
                  AND (
                    id NOT IN (SELECT petugas_id FROM users WHERE petugas_id IS NOT NULL AND id != ?)
                    OR id = (SELECT petugas_id FROM users WHERE id = ?)
                  )
                ORDER BY nama ASC
            ");
            $stmt->execute([(int)$userId, (int)$userId]);
        } else {
            $stmt = $pdo->query("
                SELECT id, nama, nip_atau_kode_mitra AS nip, jabatan, kontak AS email
                FROM petugas
                WHERE tipe = 'pegawai'
                  AND id NOT IN (SELECT petugas_id FROM users WHERE petugas_id IS NOT NULL)
                ORDER BY nama ASC
            ");
        }

        respond(true, $stmt->fetchAll());
    }

    /** Tambah akun admin baru */
    public static function store(): void
    {
        $currentUser = requireRole('superadmin');
        $body = requestBody();

        validateRequired($body, [
            'username' => 'Username',
            'password' => 'Password',
            'role'     => 'Role',
        ]);

        $username  = strtolower(trim($body['username']));
        $password  = $body['password'];
        $role      = in_array($body['role'], ['superadmin', 'admin']) ? $body['role'] : 'admin';
        $petugasId = !empty($body['petugas_id']) ? (int)$body['petugas_id'] : null;
        $email     = !empty($body['email']) ? trim($body['email']) : null;
        $nama      = !empty($body['nama']) ? trim($body['nama']) : null;

        if (strlen($password) < 6) {
            respond(false, null, 'Password minimal 6 karakter.', 422);
        }

        $pdo = Database::connect();

        // Cek username unik
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            respond(false, null, 'Username sudah digunakan oleh akun lain.', 409);
        }

        // Jika petugas_id dipilih, ambil nama & cek apakah sudah punya akun
        if ($petugasId) {
            $stmtP = $pdo->prepare('SELECT id, nama, kontak FROM petugas WHERE id = ?');
            $stmtP->execute([$petugasId]);
            $pegawai = $stmtP->fetch();
            if (!$pegawai) {
                respond(false, null, 'Pegawai tidak ditemukan.', 404);
            }
            if (!$nama) $nama = $pegawai['nama'];
            if (!$email && !empty($pegawai['kontak'])) $email = $pegawai['kontak'];

            $stmtCheck = $pdo->prepare('SELECT id FROM users WHERE petugas_id = ?');
            $stmtCheck->execute([$petugasId]);
            if ($stmtCheck->fetch()) {
                respond(false, null, 'Pegawai ini sudah memiliki akun admin.', 409);
            }
        }

        if (!$nama) $nama = $username;

        $hash = password_hash($password, PASSWORD_BCRYPT);

        $stmt = $pdo->prepare("
            INSERT INTO users (petugas_id, nama, username, email, password_hash, plain_password, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$petugasId, $nama, $username, $email, $hash, $password, $role]);
        $newId = (int)$pdo->lastInsertId();

        logActivity($pdo, (int)$currentUser['id'], 'create_user', 'users', $newId, "Buat akun admin: $username");

        respond(true, ['id' => $newId, 'username' => $username, 'nama' => $nama], 'Akun admin berhasil dibuat.', 201);
    }

    /** Update data akun (username, email, role, petugas_id) */
    public static function update(int $id): void
    {
        $currentUser = requireRole('superadmin');
        $body = requestBody();

        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            respond(false, null, 'Akun tidak ditemukan.', 404);
        }

        $username  = isset($body['username']) ? strtolower(trim($body['username'])) : $user['username'];
        $email     = isset($body['email']) ? trim($body['email']) : $user['email'];
        $role      = isset($body['role']) && in_array($body['role'], ['superadmin', 'admin']) ? $body['role'] : $user['role'];
        $petugasId = array_key_exists('petugas_id', $body) ? (!empty($body['petugas_id']) ? (int)$body['petugas_id'] : null) : $user['petugas_id'];
        $nama      = isset($body['nama']) && trim($body['nama']) !== '' ? trim($body['nama']) : $user['nama'];

        // Cek username unik (kecuali diri sendiri)
        if ($username !== $user['username']) {
            $stmtC = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id != ?');
            $stmtC->execute([$username, $id]);
            if ($stmtC->fetch()) {
                respond(false, null, 'Username sudah digunakan oleh akun lain.', 409);
            }
        }

        // Jika petugas_id berubah
        if ($petugasId && $petugasId != $user['petugas_id']) {
            $stmtP = $pdo->prepare('SELECT id, nama, kontak FROM petugas WHERE id = ?');
            $stmtP->execute([$petugasId]);
            $pegawai = $stmtP->fetch();
            if (!$pegawai) respond(false, null, 'Pegawai tidak ditemukan.', 404);

            $stmtCheck = $pdo->prepare('SELECT id FROM users WHERE petugas_id = ? AND id != ?');
            $stmtCheck->execute([$petugasId, $id]);
            if ($stmtCheck->fetch()) {
                respond(false, null, 'Pegawai ini sudah terhubung ke akun lain.', 409);
            }
            $nama = $pegawai['nama'];
        }

        $stmt = $pdo->prepare("
            UPDATE users
            SET petugas_id = ?, nama = ?, username = ?, email = ?, role = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$petugasId, $nama, $username, $email, $role, $id]);

        logActivity($pdo, (int)$currentUser['id'], 'update_user', 'users', $id, "Update akun admin: $username");

        respond(true, ['id' => $id, 'username' => $username, 'nama' => $nama, 'email' => $email, 'role' => $role], 'Data akun berhasil diperbarui.');
    }

    /** Ganti password akun */
    public static function changePassword(int $id): void
    {
        $currentUser = requireRole('superadmin');
        $body = requestBody();

        validateRequired($body, ['new_password' => 'Password Baru']);
        $newPass = $body['new_password'];

        if (strlen($newPass) < 6) {
            respond(false, null, 'Password minimal 6 karakter.', 422);
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT id, username FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            respond(false, null, 'Akun tidak ditemukan.', 404);
        }

        $hash = password_hash($newPass, PASSWORD_BCRYPT);
        $pdo->prepare('UPDATE users SET password_hash = ?, plain_password = ?, updated_at = NOW() WHERE id = ?')
            ->execute([$hash, $newPass, $id]);

        logActivity($pdo, (int)$currentUser['id'], 'change_password_user', 'users', $id, "Ganti password akun: {$user['username']}");

        respond(true, null, 'Password akun berhasil diubah.');
    }

    /** Hapus akun admin */
    public static function destroy(int $id): void
    {
        $currentUser = requireRole('superadmin');

        // Proteksi: jangan hapus akun sendiri
        if ((int)$currentUser['id'] === $id) {
            respond(false, null, 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.', 403);
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare('SELECT id, username FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            respond(false, null, 'Akun tidak ditemukan.', 404);
        }

        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);

        logActivity($pdo, (int)$currentUser['id'], 'delete_user', 'users', $id, "Hapus akun admin: {$user['username']}");

        respond(true, null, 'Akun admin berhasil dihapus.');
    }
}
