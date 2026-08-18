<?php
/**
 * PetugasController — CRUD tabel petugas (pegawai & mitra).
 *
 * Akses:
 * - GET (list)  → semua user terauthentikasi (Tim & Organisasi + Master Data)
 * - POST/PUT/DELETE → superadmin only
 *
 * Filter ?tipe=pegawai atau ?tipe=mitra untuk halaman Master Data.
 * Tanpa filter → semua (untuk Tim & Organisasi).
 */
class PetugasController
{
    private static array $VALID_TIPE = ['pegawai', 'mitra'];

    public static function index(): void
    {
        requireAuth();
        $pdo    = Database::connect();
        $tipe   = query('tipe');
        $search = query('q', '');

        $where  = [];
        $params = [];

        if ($tipe && in_array($tipe, self::$VALID_TIPE, true)) {
            $where[]  = 'tipe = ?';
            $params[] = $tipe;
        }
        if ($search !== '') {
            $like     = '%' . $search . '%';
            $where[]  = '(nama LIKE ? OR nip_atau_kode_mitra LIKE ? OR kontak LIKE ?)';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }

        $sql  = 'SELECT id, nama, tipe, nip_atau_kode_mitra, kontak, jabatan, pangkat_golongan FROM petugas';
        $sql .= $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $sql .= ' ORDER BY tipe, nama';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        respond(true, $stmt->fetchAll());
    }

    public static function store(): void
    {
        requireRole('superadmin');
        $body = requestBody();
        validateRequired($body, ['nama' => 'Nama', 'tipe' => 'Tipe']);

        $nama    = clean($body['nama']);
        $tipe    = clean($body['tipe']);
        $nipKode = clean($body['nip_atau_kode_mitra'] ?? '');
        $kontak  = clean($body['kontak'] ?? '');
        $jabatan = clean($body['jabatan'] ?? '');
        $pangkat = clean($body['pangkat_golongan'] ?? '');

        if (!in_array($tipe, self::$VALID_TIPE, true)) {
            respond(false, null, 'Tipe tidak valid. Gunakan: pegawai atau mitra.', 422);
        }

        $pdo  = Database::connect();
        $stmt = $pdo->prepare(
            'INSERT INTO petugas (nama, tipe, nip_atau_kode_mitra, kontak, jabatan, pangkat_golongan)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$nama, $tipe, $nipKode ?: null, $kontak ?: null, $jabatan ?: null, $pangkat ?: null]);
        $id = (int) $pdo->lastInsertId();

        $userId = $_SESSION['user']['id'] ?? null;
        logActivity($pdo, $userId, 'create_petugas', 'petugas', $id, "Tambah $tipe: $nama");

        $stmt = $pdo->prepare('SELECT * FROM petugas WHERE id = ?');
        $stmt->execute([$id]);
        respond(true, $stmt->fetch(), 'Data petugas berhasil ditambahkan.', 201);
    }

    public static function update(int $id): void
    {
        requireRole('superadmin');
        $body = requestBody();
        validateRequired($body, ['nama' => 'Nama', 'tipe' => 'Tipe']);

        $tipe = clean($body['tipe']);
        if (!in_array($tipe, self::$VALID_TIPE, true)) {
            respond(false, null, 'Tipe tidak valid.', 422);
        }

        $pdo  = Database::connect();
        $stmt = $pdo->prepare('SELECT id FROM petugas WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            respond(false, null, 'Data petugas tidak ditemukan.', 404);
        }

        $nama    = clean($body['nama']);
        $nipKode = clean($body['nip_atau_kode_mitra'] ?? '');
        $kontak  = clean($body['kontak'] ?? '');
        $jabatan = clean($body['jabatan'] ?? '');
        $pangkat = clean($body['pangkat_golongan'] ?? '');

        $stmt = $pdo->prepare(
            'UPDATE petugas
             SET nama = ?, tipe = ?, nip_atau_kode_mitra = ?, kontak = ?,
                 jabatan = ?, pangkat_golongan = ?
             WHERE id = ?'
        );
        $stmt->execute([$nama, $tipe, $nipKode ?: null, $kontak ?: null, $jabatan ?: null, $pangkat ?: null, $id]);

        $userId = $_SESSION['user']['id'] ?? null;
        logActivity($pdo, $userId, 'update_petugas', 'petugas', $id, "Edit $tipe: $nama");

        $stmt = $pdo->prepare('SELECT * FROM petugas WHERE id = ?');
        $stmt->execute([$id]);
        respond(true, $stmt->fetch(), 'Data petugas berhasil diperbarui.');
    }

    public static function destroy(int $id): void
    {
        requireRole('superadmin');
        $pdo  = Database::connect();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM tugas_kegiatan WHERE petugas_id = ?');
        $stmt->execute([$id]);
        if ((int) $stmt->fetchColumn() > 0) {
            respond(false, null, 'Petugas ini tidak dapat dihapus karena sudah ada data tugas terkait.', 409);
        }

        $stmt = $pdo->prepare('SELECT nama, tipe FROM petugas WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            respond(false, null, 'Data petugas tidak ditemukan.', 404);
        }

        $pdo->prepare('DELETE FROM petugas WHERE id = ?')->execute([$id]);

        $userId = $_SESSION['user']['id'] ?? null;
        logActivity($pdo, $userId, 'hapus_petugas', 'petugas', $id, "Hapus {$row['tipe']}: {$row['nama']}");

        respond(true, null, 'Data petugas berhasil dihapus.');
    }
}
