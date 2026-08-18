<?php
/**
 * MasterKegiatanController — CRUD master_kegiatan (jenis peran petugas).
 *
 * GET → semua auth user (dipakai di form tugas_kegiatan)
 * POST/PUT/DELETE → superadmin only
 */
class MasterKegiatanController
{
    public static function index(): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $stmt = $pdo->query('SELECT id, nama FROM master_kegiatan ORDER BY id');
        respond(true, $stmt->fetchAll());
    }

    public static function store(): void
    {
        $user = requireRole('superadmin');
        $body = requestBody();
        validateRequired($body, ['nama' => 'Nama Peran']);

        $nama = clean($body['nama']);
        $pdo  = Database::connect();

        // Cek duplikat
        $stmt = $pdo->prepare('SELECT id FROM master_kegiatan WHERE nama = ?');
        $stmt->execute([$nama]);
        if ($stmt->fetch()) {
            respond(false, null, 'Nama peran ini sudah ada.', 409);
        }

        $stmt = $pdo->prepare('INSERT INTO master_kegiatan (nama) VALUES (?)');
        $stmt->execute([$nama]);
        $id = (int) $pdo->lastInsertId();

        logActivity($pdo, (int)$user['id'], 'create_kegiatan', 'master_kegiatan', $id, $nama);

        respond(true, ['id' => $id, 'nama' => $nama], 'Peran berhasil ditambahkan.', 201);
    }

    public static function update(int $id): void
    {
        $user = requireRole('superadmin');
        $body = requestBody();
        validateRequired($body, ['nama' => 'Nama Peran']);

        $nama = clean($body['nama']);
        $pdo  = Database::connect();

        $stmt = $pdo->prepare('SELECT id FROM master_kegiatan WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            respond(false, null, 'Peran tidak ditemukan.', 404);
        }

        // Cek duplikat (kecuali diri sendiri)
        $stmt = $pdo->prepare('SELECT id FROM master_kegiatan WHERE nama = ? AND id != ?');
        $stmt->execute([$nama, $id]);
        if ($stmt->fetch()) {
            respond(false, null, 'Nama peran ini sudah dipakai oleh peran lain.', 409);
        }

        $pdo->prepare('UPDATE master_kegiatan SET nama = ? WHERE id = ?')->execute([$nama, $id]);
        logActivity($pdo, (int)$user['id'], 'update_kegiatan', 'master_kegiatan', $id, $nama);
        respond(true, ['id' => $id, 'nama' => $nama], 'Peran berhasil diperbarui.');
    }

    public static function destroy(int $id): void
    {
        $user = requireRole('superadmin');
        $pdo  = Database::connect();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM tugas_kegiatan WHERE kegiatan_id = ?');
        $stmt->execute([$id]);
        if ((int) $stmt->fetchColumn() > 0) {
            respond(false, null, 'Peran ini tidak dapat dihapus karena sudah dipakai di data tugas.', 409);
        }

        $stmt = $pdo->prepare('SELECT nama FROM master_kegiatan WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            respond(false, null, 'Peran tidak ditemukan.', 404);
        }

        $pdo->prepare('DELETE FROM master_kegiatan WHERE id = ?')->execute([$id]);
        logActivity($pdo, (int)$user['id'], 'hapus_kegiatan', 'master_kegiatan', $id, $row['nama']);
        respond(true, null, 'Peran berhasil dihapus.');
    }
}
