<?php
/**
 * MasterSurveiController — CRUD master_survei (superadmin only).
 */
class MasterSurveiController
{
    private static array $VALID_KATEGORI = ['Distribusi', 'Harga', 'KTIP', 'Sensus'];
    private static array $VALID_PERIODE  = ['mingguan', 'bulanan', 'triwulanan', 'tahunan'];

    public static function index(): void
    {
        requireRole('superadmin');
        $pdo    = Database::connect();
        $search = query('q', '');

        if ($search !== '') {
            $like = '%' . $search . '%';
            $stmt = $pdo->prepare(
                'SELECT id, nama_survei, kategori, jenis_periode, tautan_entri_data, materi_dokumen
                 FROM master_survei
                 WHERE nama_survei LIKE ? OR kategori LIKE ?
                 ORDER BY kategori, nama_survei'
            );
            $stmt->execute([$like, $like]);
        } else {
            $stmt = $pdo->query(
                'SELECT id, nama_survei, kategori, jenis_periode, tautan_entri_data, materi_dokumen
                 FROM master_survei
                 ORDER BY kategori, nama_survei'
            );
        }
        respond(true, $stmt->fetchAll());
    }

    public static function store(): void
    {
        $user = requireRole('superadmin');
        $body = requestBody();
        validateRequired($body, [
            'nama_survei'   => 'Nama Survei',
            'kategori'      => 'Kategori',
            'jenis_periode' => 'Jenis Periode',
        ]);

        $namaSurvei    = clean($body['nama_survei']);
        $kategori      = clean($body['kategori']);
        $jenisPeriode  = clean($body['jenis_periode']);
        $tautanEntri   = clean($body['tautan_entri_data'] ?? '');
        $materiDokumen = clean($body['materi_dokumen'] ?? '');

        if (!in_array($kategori, self::$VALID_KATEGORI, true)) {
            respond(false, null, 'Kategori tidak valid. Pilih: ' . implode(', ', self::$VALID_KATEGORI), 422);
        }
        if (!in_array($jenisPeriode, self::$VALID_PERIODE, true)) {
            respond(false, null, 'Jenis periode tidak valid. Pilih: ' . implode(', ', self::$VALID_PERIODE), 422);
        }

        $pdo  = Database::connect();
        $stmt = $pdo->prepare(
            'INSERT INTO master_survei (nama_survei, kategori, jenis_periode, tautan_entri_data, materi_dokumen)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $namaSurvei, $kategori, $jenisPeriode,
            $tautanEntri ?: null, $materiDokumen ?: null,
        ]);
        $id = (int) $pdo->lastInsertId();

        logActivity($pdo, (int)$user['id'], 'create_survei', 'master_survei', $id, $namaSurvei);

        $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE id = ?');
        $stmt->execute([$id]);
        respond(true, $stmt->fetch(), 'Data survei berhasil ditambahkan.', 201);
    }

    public static function update(int $id): void
    {
        $user = requireRole('superadmin');
        $body = requestBody();
        validateRequired($body, [
            'nama_survei'   => 'Nama Survei',
            'kategori'      => 'Kategori',
            'jenis_periode' => 'Jenis Periode',
        ]);

        $kategori     = clean($body['kategori']);
        $jenisPeriode = clean($body['jenis_periode']);

        if (!in_array($kategori, self::$VALID_KATEGORI, true)) {
            respond(false, null, 'Kategori tidak valid.', 422);
        }
        if (!in_array($jenisPeriode, self::$VALID_PERIODE, true)) {
            respond(false, null, 'Jenis periode tidak valid.', 422);
        }

        $pdo  = Database::connect();
        $stmt = $pdo->prepare('SELECT id FROM master_survei WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            respond(false, null, 'Data survei tidak ditemukan.', 404);
        }

        $stmt = $pdo->prepare(
            'UPDATE master_survei
             SET nama_survei = ?, kategori = ?, jenis_periode = ?,
                 tautan_entri_data = ?, materi_dokumen = ?
             WHERE id = ?'
        );
        $stmt->execute([
            clean($body['nama_survei']), $kategori, $jenisPeriode,
            clean($body['tautan_entri_data'] ?? '') ?: null,
            clean($body['materi_dokumen'] ?? '') ?: null,
            $id,
        ]);

        logActivity($pdo, (int)$user['id'], 'update_survei', 'master_survei', $id);

        $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE id = ?');
        $stmt->execute([$id]);
        respond(true, $stmt->fetch(), 'Data survei berhasil diperbarui.');
    }

    public static function destroy(int $id): void
    {
        $user = requireRole('superadmin');
        $pdo  = Database::connect();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM tugas_kegiatan WHERE survei_id = ?');
        $stmt->execute([$id]);
        if ((int) $stmt->fetchColumn() > 0) {
            respond(false, null, 'Survei ini tidak dapat dihapus karena sudah ada data tugas terkait.', 409);
        }

        $stmt = $pdo->prepare('SELECT nama_survei FROM master_survei WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            respond(false, null, 'Data survei tidak ditemukan.', 404);
        }

        $pdo->prepare('DELETE FROM master_survei WHERE id = ?')->execute([$id]);
        logActivity($pdo, (int)$user['id'], 'hapus_survei', 'master_survei', $id, $row['nama_survei']);
        respond(true, null, 'Data survei berhasil dihapus.');
    }
}
