<?php
/**
 * MasterSurveiController — CRUD master_survei (superadmin only).
 */
class MasterSurveiController
{
    private static array $VALID_KATEGORI = ['Distribusi', 'Harga', 'KTIP', 'Sensus'];
    private static array $VALID_PERIODE  = ['mingguan', 'bulanan', 'triwulanan', 'tahunan'];

    private static function extractFields(array $body): array
    {
        $kode         = trim($body['kode_survei'] ?? '');
        $tautanEntri  = clean($body['tautan_entri_data'] ?? '');
        $materiDok    = clean($body['materi_dokumen'] ?? '');
        $deadlineHari = isset($body['deadline_hari']) && $body['deadline_hari'] !== ''
                        ? max(1, min(31, (int)$body['deadline_hari'])) : null;

        // Bulan mulai/selesai (hanya untuk tahunan, nullable)
        $bulanMulai   = isset($body['bulan_mulai'])   && $body['bulan_mulai']   !== '' ? max(1, min(12, (int)$body['bulan_mulai']))   : null;
        $bulanSelesai = isset($body['bulan_selesai']) && $body['bulan_selesai'] !== '' ? max(1, min(12, (int)$body['bulan_selesai'])) : null;

        // Tanggal koleksi Minggu 1 (semua jenis periode)
        $tglMulai   = isset($body['tanggal_mulai_koleksi'])   && $body['tanggal_mulai_koleksi']   !== '' ? max(1, min(31, (int)$body['tanggal_mulai_koleksi']))   : null;
        $tglSelesai = isset($body['tanggal_selesai_koleksi']) && $body['tanggal_selesai_koleksi'] !== '' ? max(1, min(31, (int)$body['tanggal_selesai_koleksi'])) : null;

        // Tanggal koleksi Minggu 2 (khusus mingguan)
        $tglMulaiMg2   = isset($body['tanggal_mulai_mg2'])   && $body['tanggal_mulai_mg2']   !== '' ? max(1, min(31, (int)$body['tanggal_mulai_mg2']))   : null;
        $tglSelesaiMg2 = isset($body['tanggal_selesai_mg2']) && $body['tanggal_selesai_mg2'] !== '' ? max(1, min(31, (int)$body['tanggal_selesai_mg2'])) : null;

        // Validasi bulan: jika salah satu diisi, keduanya harus diisi dan mulai ≤ selesai
        if (($bulanMulai !== null) !== ($bulanSelesai !== null)) {
            respond(false, null, 'Bulan mulai dan bulan selesai harus diisi bersama-sama.', 422);
        }
        if ($bulanMulai !== null && $bulanSelesai !== null && $bulanMulai > $bulanSelesai) {
            respond(false, null, 'Bulan mulai tidak boleh lebih besar dari bulan selesai.', 422);
        }

        return [
            'kode_survei'             => $kode ?: null,
            'tautan_entri_data'       => $tautanEntri ?: null,
            'materi_dokumen'          => $materiDok ?: null,
            'deadline_hari'           => $deadlineHari,
            'bulan_mulai'             => $bulanMulai,
            'bulan_selesai'           => $bulanSelesai,
            'tanggal_mulai_koleksi'   => $tglMulai,
            'tanggal_selesai_koleksi' => $tglSelesai,
            'tanggal_mulai_mg2'       => $tglMulaiMg2,
            'tanggal_selesai_mg2'     => $tglSelesaiMg2,
        ];
    }

    public static function index(): void
    {
        requireRole('superadmin');
        $pdo    = Database::connect();
        $search = query('q', '');

        $cols = 'id, kode_survei, nama_survei, kategori, jenis_periode, deadline_hari,
                 tautan_entri_data, materi_dokumen,
                 bulan_mulai, bulan_selesai,
                 tanggal_mulai_koleksi, tanggal_selesai_koleksi,
                 tanggal_mulai_mg2, tanggal_selesai_mg2';

        if ($search !== '') {
            $like = '%' . $search . '%';
            $stmt = $pdo->prepare(
                "SELECT {$cols} FROM master_survei
                 WHERE nama_survei LIKE ? OR kategori LIKE ? OR kode_survei LIKE ?
                 ORDER BY kategori, nama_survei"
            );
            $stmt->execute([$like, $like, $like]);
        } else {
            $stmt = $pdo->query("SELECT {$cols} FROM master_survei ORDER BY kategori, nama_survei");
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

        $namaSurvei   = clean($body['nama_survei']);
        $kategori     = clean($body['kategori']);
        $jenisPeriode = clean($body['jenis_periode']);

        if (!in_array($kategori, self::$VALID_KATEGORI, true)) {
            respond(false, null, 'Kategori tidak valid. Pilih: ' . implode(', ', self::$VALID_KATEGORI), 422);
        }
        if (!in_array($jenisPeriode, self::$VALID_PERIODE, true)) {
            respond(false, null, 'Jenis periode tidak valid. Pilih: ' . implode(', ', self::$VALID_PERIODE), 422);
        }

        $f   = self::extractFields($body);
        $pdo = Database::connect();
        $stmt = $pdo->prepare(
            'INSERT INTO master_survei
             (nama_survei, kode_survei, kategori, jenis_periode, deadline_hari,
              tautan_entri_data, materi_dokumen,
              bulan_mulai, bulan_selesai,
              tanggal_mulai_koleksi, tanggal_selesai_koleksi,
              tanggal_mulai_mg2, tanggal_selesai_mg2)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $namaSurvei, $f['kode_survei'], $kategori, $jenisPeriode, $f['deadline_hari'],
            $f['tautan_entri_data'], $f['materi_dokumen'],
            $f['bulan_mulai'], $f['bulan_selesai'],
            $f['tanggal_mulai_koleksi'], $f['tanggal_selesai_koleksi'],
            $f['tanggal_mulai_mg2'], $f['tanggal_selesai_mg2'],
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

        $f = self::extractFields($body);
        $pdo->prepare(
            'UPDATE master_survei
             SET nama_survei = ?, kode_survei = ?, kategori = ?, jenis_periode = ?, deadline_hari = ?,
                 tautan_entri_data = ?, materi_dokumen = ?,
                 bulan_mulai = ?, bulan_selesai = ?,
                 tanggal_mulai_koleksi = ?, tanggal_selesai_koleksi = ?,
                 tanggal_mulai_mg2 = ?, tanggal_selesai_mg2 = ?
             WHERE id = ?'
        )->execute([
            clean($body['nama_survei']), $f['kode_survei'], $kategori, $jenisPeriode, $f['deadline_hari'],
            $f['tautan_entri_data'], $f['materi_dokumen'],
            $f['bulan_mulai'], $f['bulan_selesai'],
            $f['tanggal_mulai_koleksi'], $f['tanggal_selesai_koleksi'],
            $f['tanggal_mulai_mg2'], $f['tanggal_selesai_mg2'],
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
