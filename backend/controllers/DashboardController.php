<?php
/**
 * DashboardController — Agregasi data untuk halaman Dasbor Utama.
 *
 * Endpoints:
 * GET /api/dashboard/summary          → 4 KPI card
 * GET /api/dashboard/progress-wilayah → bar chart per kecamatan/desa
 * GET /api/dashboard/progress-survei  → bar chart per survei
 * GET /api/dashboard/deadline-dekat   → panel pengingat deadline
 * GET /api/dashboard/progress-trend   → data tabel per kecamatan
 */
class DashboardController
{
    // ─── Helper: WHERE clause dari filter tahun & bulan ──────────────────────
    private static function buildPeriodeWhere(): array
    {
        $where  = [];
        $params = [];

        if ($tahun = query('tahun')) {
            $where[]  = 't.tahun = ?';
            $params[] = (int)$tahun;
        }
        if ($bulan = query('bulan')) {
            $where[]  = 't.bulan = ?';
            $params[] = (int)$bulan;
        }
        if ($survei_id = query('survei_id')) {
            $where[]  = 't.survei_id = ?';
            $params[] = (int)$survei_id;
        }
        if ($kecamatan = query('kecamatan')) {
            $where[]  = 'mw.kecamatan = ?';
            $params[] = $kecamatan;
        }

        return [$where, $params];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY — 4 KPI cards
    // ─────────────────────────────────────────────────────────────────────────
    public static function summary(): void
    {
        requireAuth();
        $pdo = Database::connect();
        [$where, $params] = self::buildPeriodeWhere();

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        // Total, berjalan, selesai, rata-rata persen
        $sql = "
            SELECT
                COUNT(*) AS total,
                SUM(CASE
                    WHEN sampel_selesai >= target_sampel AND target_sampel > 0 THEN 1 ELSE 0
                END) AS selesai,
                SUM(CASE
                    WHEN sampel_selesai > 0 AND sampel_selesai < target_sampel THEN 1 ELSE 0
                END) AS berjalan,
                SUM(CASE
                    WHEN sampel_selesai = 0 THEN 1 ELSE 0
                END) AS belum_mulai,
                ROUND(
                    AVG(
                        CASE WHEN target_sampel > 0
                             THEN LEAST(100, sampel_selesai / target_sampel * 100)
                             ELSE 0 END
                    ), 1
                ) AS rata_persen,
                SUM(target_sampel)  AS total_target,
                SUM(sampel_selesai) AS total_selesai
            FROM tugas_kegiatan t
            JOIN master_wilayah mw ON mw.id = t.wilayah_id
            $whereSql
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();

        respond(true, [
            'total'        => (int)$row['total'],
            'selesai'      => (int)$row['selesai'],
            'berjalan'     => (int)$row['berjalan'],
            'belum_mulai'  => (int)$row['belum_mulai'],
            'rata_persen'  => (float)$row['rata_persen'],
            'total_target' => (int)$row['total_target'],
            'total_selesai'=> (int)$row['total_selesai'],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROGRESS PER WILAYAH (bar chart + tabel)
    // ─────────────────────────────────────────────────────────────────────────
    public static function progressWilayah(): void
    {
        requireAuth();
        $pdo = Database::connect();
        [$where, $params] = self::buildPeriodeWhere();

        // Grouping: jika ada filter kecamatan → group by desa; else by kecamatan
        $byDesa = (bool)query('kecamatan');
        $groupCol = $byDesa ? 'mw.desa_kelurahan' : 'mw.kecamatan';
        $labelCol = $byDesa ? 'desa_kelurahan' : 'kecamatan';

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "
            SELECT
                $groupCol AS label,
                COUNT(*) AS total_tugas,
                SUM(target_sampel)  AS total_target,
                SUM(sampel_selesai) AS total_selesai,
                ROUND(
                    SUM(sampel_selesai) / NULLIF(SUM(target_sampel), 0) * 100, 1
                ) AS persen
            FROM tugas_kegiatan t
            JOIN master_wilayah mw ON mw.id = t.wilayah_id
            $whereSql
            GROUP BY $groupCol
            ORDER BY persen DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        respond(true, $stmt->fetchAll());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROGRESS PER SURVEI
    // ─────────────────────────────────────────────────────────────────────────
    public static function progressSurvei(): void
    {
        requireAuth();
        $pdo = Database::connect();
        [$where, $params] = self::buildPeriodeWhere();
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "
            SELECT
                ms.nama_survei AS label,
                ms.kategori,
                COUNT(*) AS total_tugas,
                SUM(t.target_sampel)  AS total_target,
                SUM(t.sampel_selesai) AS total_selesai,
                ROUND(
                    SUM(t.sampel_selesai) / NULLIF(SUM(t.target_sampel), 0) * 100, 1
                ) AS persen
            FROM tugas_kegiatan t
            JOIN master_survei ms  ON ms.id = t.survei_id
            JOIN master_wilayah mw ON mw.id = t.wilayah_id
            $whereSql
            GROUP BY ms.id, ms.nama_survei, ms.kategori
            ORDER BY persen DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        respond(true, $stmt->fetchAll());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEADLINE MENDEKAT — in-app reminder
    // ─────────────────────────────────────────────────────────────────────────
    public static function deadlineDekat(): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $hari = max(1, min(60, (int)(query('hari') ?? 7)));

        // Ambil tugas yang deadline-nya dalam N hari ke depan & belum selesai
        $stmt = $pdo->prepare("
            SELECT
                t.id, ms.nama_survei, mw.kecamatan, mw.desa_kelurahan,
                p.nama AS nama_petugas,
                t.target_sampel, t.sampel_selesai, t.deadline,
                DATEDIFF(t.deadline, CURDATE()) AS sisa_hari,
                ROUND(
                    t.sampel_selesai / NULLIF(t.target_sampel, 0) * 100, 1
                ) AS persen
            FROM tugas_kegiatan t
            JOIN master_survei   ms ON ms.id = t.survei_id
            JOIN master_wilayah  mw ON mw.id = t.wilayah_id
            JOIN petugas          p  ON p.id  = t.petugas_id
            WHERE t.deadline BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL {$hari} DAY)
              AND (t.sampel_selesai < t.target_sampel OR t.target_sampel = 0)
            ORDER BY t.deadline ASC
            LIMIT 50
        ");
        $stmt->execute();
        respond(true, $stmt->fetchAll());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROGRESS TREND — mini line/area data per bulan dalam 1 tahun
    // ─────────────────────────────────────────────────────────────────────────
    public static function progressTrend(): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $tahun = (int)(query('tahun') ?? date('Y'));

        $stmt = $pdo->prepare("
            SELECT
                t.bulan,
                t.triwulan_ke,
                ms.jenis_periode,
                COUNT(*) AS total_tugas,
                SUM(t.target_sampel)  AS total_target,
                SUM(t.sampel_selesai) AS total_selesai,
                ROUND(
                    SUM(t.sampel_selesai) / NULLIF(SUM(t.target_sampel), 0) * 100, 1
                ) AS persen
            FROM tugas_kegiatan t
            JOIN master_survei ms ON ms.id = t.survei_id
            WHERE t.tahun = ?
            GROUP BY t.bulan, t.triwulan_ke, ms.jenis_periode
            ORDER BY t.bulan, t.triwulan_ke
        ");
        $stmt->execute([$tahun]);
        respond(true, $stmt->fetchAll());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TAHUN TERSEDIA — untuk dropdown filter
    // ─────────────────────────────────────────────────────────────────────────
    public static function availableYears(): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $stmt = $pdo->query('SELECT DISTINCT tahun FROM tugas_kegiatan ORDER BY tahun DESC');
        $years = $stmt->fetchAll(PDO::FETCH_COLUMN);
        // Pastikan tahun ini selalu ada
        $currentYear = (int)date('Y');
        if (!in_array($currentYear, $years)) {
            array_unshift($years, $currentYear);
        }
        respond(true, $years);
    }
}
