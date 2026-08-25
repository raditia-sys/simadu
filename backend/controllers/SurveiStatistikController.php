<?php
/**
 * SurveiStatistikController — Halaman detail per survei.
 *
 * Template dipakai oleh semua route survei (SAPB, HD, SHP, SE2026, dll.)
 *
 * Endpoints:
 * GET /api/survei-statistik/info?nama=    → detail survei dari master_survei (partial-match)
 * GET /api/survei-statistik/progress?survei_id=&tahun=  → progress per kecamatan + desa
 * GET /api/survei-statistik/petugas?survei_id=&tahun=   → tabel petugas + progress
 * GET /api/survei-statistik/dokumen?survei_id=           → dokumen terkait (placeholder, siap diperluas)
 */
class SurveiStatistikController
{
    // ─────────────────────────────────────────────────────────────────────────
    // INFO — cari survei berdasarkan nama (partial match)
    // ─────────────────────────────────────────────────────────────────────────
    public static function info(): void
    {
        requireAuth();
        $id   = query('id');
        $kode = trim(query('kode') ?? '');
        $nama = trim(query('nama') ?? '');
        if ($nama === '' && $kode === '' && !$id) {
            respond(false, null, 'Parameter nama, kode, atau id wajib diisi.', 422);
        }

        $pdo = Database::connect();
        $survei = null;

        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE id = ? LIMIT 1');
            $stmt->execute([(int)$id]);
            $survei = $stmt->fetch();
        } else {
            // 1. Coba cari berdasarkan nama_survei exact terlebih dahulu (prioritas tertinggi untuk membedakan nama unik seperti SHPB Bulanan & Mingguan)
            if ($nama !== '') {
                $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE nama_survei = ? LIMIT 1');
                $stmt->execute([$nama]);
                $survei = $stmt->fetch();
            }

            // 2. Coba cari berdasarkan kode_survei jika parameter kode ada
            if (!$survei && $kode !== '') {
                $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE kode_survei = ? LIMIT 1');
                $stmt->execute([$kode]);
                $survei = $stmt->fetch();
            }

            // 3. Coba cari jika $nama adalah kode_survei (misal kirim nama="K3" atau "SLK-KSP")
            if (!$survei && $nama !== '') {
                $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE kode_survei = ? LIMIT 1');
                $stmt->execute([$nama]);
                $survei = $stmt->fetch();
            }

            // 4. Cek alias map
            if (!$survei) {
                $aliases = [
                    'SAPB' => 'Survei Angkutan Penumpang dan Barang',
                    'HD' => 'Survei Harga Perdesaan',
                    'HKD' => 'Survei Harga Konsumen Perdesaan',
                    'SHP' => 'Survei Harga Produsen',
                    'SHPB' => 'Survei Harga Perdagangan Besar (Bulanan)',
                    'SHKK' => 'Survei Harga Kemahalan Konstruksi',
                    'BUMD' => 'Survei Keuangan Badan Usaha Milik Daerah',
                    'SLK' => 'Survei Lembaga Keuangan - Koperasi Simpan Pinjam',
                    'SLK-KSP' => 'Survei Lembaga Keuangan - Koperasi Simpan Pinjam',
                    'K3' => 'Survei Keuangan Konstruksi',
                    'Survei Keuangan Konstruksi' => 'Survei Keuangan Konstruksi',
                    'VHTL' => 'Survei Hotel dan Jasa Akomodasi Lainnya Tahunan',
                    'VHTS' => 'Survei Tingkat Penghunian Kamar Hotel',
                    'SE2026 Persiapan' => 'Persiapan Sensus Ekonomi',
                    'SE2026 Pelaksanaan' => 'Pelaksanaan Sensus Ekonomi',
                    'SE2026 Pengolahan & Diseminasi' => 'Pengolahan dan Diseminasi Sensus Ekonomi',
                ];

                $aliasTarget = $aliases[strtoupper($kode)] ?? $aliases[$kode] ?? $aliases[strtoupper($nama)] ?? $aliases[$nama] ?? null;
                if ($aliasTarget) {
                    $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE nama_survei = ? OR kode_survei = ? LIMIT 1');
                    $stmt->execute([$aliasTarget, $aliasTarget]);
                    $survei = $stmt->fetch();
                }
            }

            // 5. Fallback ke LIKE pada nama_survei
            if (!$survei && $nama !== '') {
                $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE nama_survei LIKE ? LIMIT 1');
                $stmt->execute(['%' . $nama . '%']);
                $survei = $stmt->fetch();
            }
        }

        if (!$survei) {
            respond(false, null, 'Survei tidak ditemukan.', 404);
        }

        // Hitung summary cepat (semua tahun)
        $stmtS = $pdo->prepare('
            SELECT
                COUNT(*) AS total_tugas,
                SUM(target_sampel)  AS total_target,
                SUM(sampel_selesai) AS total_selesai,
                MIN(tahun) AS tahun_min,
                MAX(tahun) AS tahun_max,
                ROUND(
                    SUM(sampel_selesai) / NULLIF(SUM(target_sampel), 0) * 100, 1
                ) AS persen_overall
            FROM tugas_kegiatan
            WHERE survei_id = ?
        ');
        $stmtS->execute([$survei['id']]);
        $survei['_summary'] = $stmtS->fetch();

        respond(true, $survei);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROGRESS — per kecamatan & desa
    // ─────────────────────────────────────────────────────────────────────────
    public static function progress(): void
    {
        requireAuth();

        $survei_id = (int)(query('survei_id') ?? 0);
        if ($survei_id === 0) respond(false, null, 'survei_id wajib diisi.', 422);

        $pdo = Database::connect();

        // Build filter
        $where    = ['t.survei_id = ?'];
        $params   = [$survei_id];

        if ($tahun = query('tahun'))  { $where[] = 't.tahun = ?'; $params[] = (int)$tahun; }
        if ($bulan = query('bulan'))  { $where[] = 't.bulan = ?'; $params[] = (int)$bulan; }
        if ($tw    = query('triwulan_ke')) { $where[] = 't.triwulan_ke = ?'; $params[] = (int)$tw; }

        $whereSql = 'WHERE ' . implode(' AND ', $where);

        // Level kecamatan
        $stmtK = $pdo->prepare("
            SELECT
                COALESCE(mw.kecamatan, 'Lintas Wilayah') AS label,
                'kecamatan' AS level,
                COUNT(*) AS total_tugas,
                SUM(t.target_sampel)  AS total_target,
                SUM(t.sampel_selesai) AS total_selesai,
                ROUND(SUM(t.sampel_selesai) / NULLIF(SUM(t.target_sampel), 0) * 100, 1) AS persen
            FROM tugas_kegiatan t
            LEFT JOIN master_wilayah mw ON mw.id = t.wilayah_id
            $whereSql
            GROUP BY COALESCE(mw.kecamatan, 'Lintas Wilayah')
            ORDER BY persen DESC
        ");
        $stmtK->execute($params);
        $byKecamatan = $stmtK->fetchAll();

        // Level desa
        $stmtD = $pdo->prepare("
            SELECT
                COALESCE(mw.kecamatan, 'Lintas Wilayah') AS kecamatan,
                COALESCE(mw.desa_kelurahan, 'Seluruh Wilayah') AS label,
                'desa' AS level,
                COUNT(*) AS total_tugas,
                SUM(t.target_sampel)  AS total_target,
                SUM(t.sampel_selesai) AS total_selesai,
                ROUND(SUM(t.sampel_selesai) / NULLIF(SUM(t.target_sampel), 0) * 100, 1) AS persen
            FROM tugas_kegiatan t
            LEFT JOIN master_wilayah mw ON mw.id = t.wilayah_id
            $whereSql
            GROUP BY mw.kecamatan, mw.desa_kelurahan
            ORDER BY mw.kecamatan, persen DESC
        ");
        $stmtD->execute($params);
        $byDesa = $stmtD->fetchAll();

        respond(true, [
            'by_kecamatan' => $byKecamatan,
            'by_desa'      => $byDesa,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PETUGAS — tabel detail per petugas di survei ini
    // ─────────────────────────────────────────────────────────────────────────
    public static function petugas(): void
    {
        requireAuth();

        $survei_id = (int)(query('survei_id') ?? 0);
        if ($survei_id === 0) respond(false, null, 'survei_id wajib diisi.', 422);

        $pdo = Database::connect();
        $where  = ['t.survei_id = ?'];
        $params = [$survei_id];

        if ($tahun = query('tahun'))  { $where[] = 't.tahun = ?'; $params[] = (int)$tahun; }
        if ($kec   = query('kecamatan')) {
            if ($kec === '__none__' || $kec === 'Lintas Wilayah' || $kec === 'Non-Wilayah') {
                $where[] = 't.wilayah_id IS NULL';
            } else {
                $where[] = 'mw.kecamatan = ?';
                $params[] = $kec;
            }
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $stmt = $pdo->prepare("
            SELECT
                t.id,
                t.survei_id,
                t.wilayah_id,
                t.petugas_id,
                t.kegiatan_id,
                t.pemeriksa_id,
                p.nama  AS nama_petugas,
                p.tipe  AS tipe_petugas,
                mk.nama AS nama_peran,
                COALESCE(mw.kecamatan, 'Lintas Wilayah') AS kecamatan,
                COALESCE(mw.desa_kelurahan, 'Seluruh Wilayah') AS desa_kelurahan,
                mw.kecamatan AS wilayah_kecamatan,
                t.tahun, t.bulan, t.triwulan_ke, t.minggu_ke,
                t.target_sampel, t.sampel_selesai, t.catatan, t.deadline,
                ms.jenis_periode,
                ROUND(t.sampel_selesai / NULLIF(t.target_sampel, 0) * 100, 1) AS persen
            FROM tugas_kegiatan t
            JOIN master_survei   ms ON ms.id = t.survei_id
            LEFT JOIN master_wilayah  mw ON mw.id = t.wilayah_id
            JOIN petugas          p  ON p.id  = t.petugas_id
            JOIN master_kegiatan mk  ON mk.id = t.kegiatan_id
            $whereSql
            ORDER BY t.tahun DESC, COALESCE(t.bulan, t.triwulan_ke * 3, 1) ASC, COALESCE(t.minggu_ke, 1) ASC, t.deadline ASC, COALESCE(mw.kecamatan, 'ZZZ') ASC, COALESCE(mw.desa_kelurahan, 'ZZZ') ASC, p.nama ASC
        ");
        $stmt->execute($params);
        respond(true, $stmt->fetchAll());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DOKUMEN — placeholder, siap diperluas saat Manajemen Dokumen dibangun
    // ─────────────────────────────────────────────────────────────────────────
    public static function dokumen(): void
    {
        requireAuth();
        $survei_id = (int)(query('survei_id') ?? 0);
        if ($survei_id === 0) respond(false, null, 'survei_id wajib diisi.', 422);

        // Akan di-query dari tabel dokumen saat Tahap 8 selesai
        // Sementara kembalikan array kosong agar frontend tidak error
        respond(true, []);
    }
}
