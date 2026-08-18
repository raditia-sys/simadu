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
        $nama = trim(query('nama') ?? '');
        if ($nama === '') respond(false, null, 'Parameter nama wajib diisi.', 422);

        $pdo  = Database::connect();

        // Coba exact match dulu, lalu fallback ke LIKE
        $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE nama_survei = ? LIMIT 1');
        $stmt->execute([$nama]);
        $survei = $stmt->fetch();

        if (!$survei) {
            $stmt = $pdo->prepare('SELECT * FROM master_survei WHERE nama_survei LIKE ? LIMIT 1');
            $stmt->execute(['%' . $nama . '%']);
            $survei = $stmt->fetch();
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
                mw.kecamatan AS label,
                'kecamatan' AS level,
                COUNT(*) AS total_tugas,
                SUM(t.target_sampel)  AS total_target,
                SUM(t.sampel_selesai) AS total_selesai,
                ROUND(SUM(t.sampel_selesai) / NULLIF(SUM(t.target_sampel), 0) * 100, 1) AS persen
            FROM tugas_kegiatan t
            JOIN master_wilayah mw ON mw.id = t.wilayah_id
            $whereSql
            GROUP BY mw.kecamatan
            ORDER BY persen DESC
        ");
        $stmtK->execute($params);
        $byKecamatan = $stmtK->fetchAll();

        // Level desa
        $stmtD = $pdo->prepare("
            SELECT
                mw.kecamatan,
                mw.desa_kelurahan AS label,
                'desa' AS level,
                COUNT(*) AS total_tugas,
                SUM(t.target_sampel)  AS total_target,
                SUM(t.sampel_selesai) AS total_selesai,
                ROUND(SUM(t.sampel_selesai) / NULLIF(SUM(t.target_sampel), 0) * 100, 1) AS persen
            FROM tugas_kegiatan t
            JOIN master_wilayah mw ON mw.id = t.wilayah_id
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
        if ($kec   = query('kecamatan')) { $where[] = 'mw.kecamatan = ?'; $params[] = $kec; }

        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $stmt = $pdo->prepare("
            SELECT
                t.id,
                p.nama  AS nama_petugas,
                p.tipe  AS tipe_petugas,
                mk.nama AS nama_peran,
                mw.kecamatan, mw.desa_kelurahan,
                t.tahun, t.bulan, t.triwulan_ke, t.minggu_ke,
                t.target_sampel, t.sampel_selesai, t.deadline,
                ms.jenis_periode,
                ROUND(t.sampel_selesai / NULLIF(t.target_sampel, 0) * 100, 1) AS persen
            FROM tugas_kegiatan t
            JOIN master_survei   ms ON ms.id = t.survei_id
            JOIN master_wilayah  mw ON mw.id = t.wilayah_id
            JOIN petugas          p  ON p.id  = t.petugas_id
            JOIN master_kegiatan mk  ON mk.id = t.kegiatan_id
            $whereSql
            ORDER BY mw.kecamatan, mw.desa_kelurahan, p.nama
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
