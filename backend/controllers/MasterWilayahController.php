<?php
/**
 * MasterWilayahController — CRUD master_wilayah (superadmin only).
 * Wilayah = desa/kelurahan dengan tarif transport lokal.
 */
class MasterWilayahController
{
    public static function index(): void
    {
        requireRole('superadmin');
        $pdo    = Database::connect();
        $search = query('q', '');

        if ($search !== '') {
            $like = '%' . $search . '%';
            $stmt = $pdo->prepare(
                'SELECT id, kecamatan, desa_kelurahan, rate_transport_lokal
                 FROM master_wilayah
                 WHERE kecamatan LIKE ? OR desa_kelurahan LIKE ?
                 ORDER BY kecamatan, desa_kelurahan'
            );
            $stmt->execute([$like, $like]);
        } else {
            $stmt = $pdo->query(
                'SELECT id, kecamatan, desa_kelurahan, rate_transport_lokal
                 FROM master_wilayah
                 ORDER BY kecamatan, desa_kelurahan'
            );
        }
        respond(true, $stmt->fetchAll());
    }

    public static function store(): void
    {
        $user = requireRole('superadmin');
        $body = requestBody();
        validateRequired($body, [
            'kecamatan'      => 'Kecamatan',
            'desa_kelurahan' => 'Desa/Kelurahan',
        ]);

        $kecamatan            = clean($body['kecamatan']);
        $desaKelurahan        = clean($body['desa_kelurahan']);
        $rateTransportLokal   = (float) ($body['rate_transport_lokal'] ?? 0);

        $pdo  = Database::connect();
        $stmt = $pdo->prepare(
            'INSERT INTO master_wilayah (kecamatan, desa_kelurahan, rate_transport_lokal)
             VALUES (?, ?, ?)'
        );
        $stmt->execute([$kecamatan, $desaKelurahan, $rateTransportLokal]);
        $id = (int) $pdo->lastInsertId();

        logActivity($pdo, (int)$user['id'], 'create_wilayah', 'master_wilayah', $id, $kecamatan . ' - ' . $desaKelurahan);

        $stmt = $pdo->prepare('SELECT * FROM master_wilayah WHERE id = ?');
        $stmt->execute([$id]);
        respond(true, $stmt->fetch(), 'Data wilayah berhasil ditambahkan.', 201);
    }

    public static function update(int $id): void
    {
        $user = requireRole('superadmin');
        $body = requestBody();
        validateRequired($body, [
            'kecamatan'      => 'Kecamatan',
            'desa_kelurahan' => 'Desa/Kelurahan',
        ]);

        $pdo  = Database::connect();
        $stmt = $pdo->prepare('SELECT id FROM master_wilayah WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            respond(false, null, 'Data wilayah tidak ditemukan.', 404);
        }

        $kecamatan          = clean($body['kecamatan']);
        $desaKelurahan      = clean($body['desa_kelurahan']);
        $rateTransportLokal = (float) ($body['rate_transport_lokal'] ?? 0);

        $stmt = $pdo->prepare(
            'UPDATE master_wilayah
             SET kecamatan = ?, desa_kelurahan = ?, rate_transport_lokal = ?
             WHERE id = ?'
        );
        $stmt->execute([$kecamatan, $desaKelurahan, $rateTransportLokal, $id]);

        logActivity($pdo, (int)$user['id'], 'update_wilayah', 'master_wilayah', $id);

        $stmt = $pdo->prepare('SELECT * FROM master_wilayah WHERE id = ?');
        $stmt->execute([$id]);
        respond(true, $stmt->fetch(), 'Data wilayah berhasil diperbarui.');
    }

    public static function destroy(int $id): void
    {
        $user = requireRole('superadmin');
        $pdo  = Database::connect();

        // Cek apakah wilayah dipakai di tugas_kegiatan atau laporan_perjalanan_dinas
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM tugas_kegiatan WHERE wilayah_id = ?');
        $stmt->execute([$id]);
        if ((int) $stmt->fetchColumn() > 0) {
            respond(false, null, 'Wilayah ini tidak dapat dihapus karena sudah dipakai di data tugas.', 409);
        }

        $stmt = $pdo->prepare('SELECT kecamatan, desa_kelurahan FROM master_wilayah WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            respond(false, null, 'Data wilayah tidak ditemukan.', 404);
        }

        $pdo->prepare('DELETE FROM master_wilayah WHERE id = ?')->execute([$id]);

        logActivity($pdo, (int)$user['id'], 'hapus_wilayah', 'master_wilayah', $id, $row['kecamatan'] . ' - ' . $row['desa_kelurahan']);

        respond(true, null, 'Data wilayah berhasil dihapus.');
    }
}
