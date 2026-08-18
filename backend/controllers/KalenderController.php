<?php
/**
 * KalenderController — Event kalender manual + agregat deadline tugas.
 *
 * Endpoints:
 * GET    /api/kalender            → semua event (manual + tugas)
 * POST   /api/kalender            → tambah event manual
 * PUT    /api/kalender/{id}       → edit event manual
 * DELETE /api/kalender/{id}       → hapus event manual
 */
class KalenderController
{
    /** Schema CREATE TABLE yang konsisten, dipakai di semua method */
    private static function ensureTable(PDO $pdo): void
    {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS agenda_event (
                id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                judul          VARCHAR(255) NOT NULL,
                tanggal        DATE NOT NULL,
                tanggal_selesai DATE NULL,
                tipe           VARCHAR(50)  NOT NULL DEFAULT 'umum',
                keterangan     TEXT NULL,
                warna          VARCHAR(20)  DEFAULT 'navy',
                created_by     INT UNSIGNED NULL,
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INDEX — gabungkan event manual dari tabel agenda_event dan deadline tugas
    // ─────────────────────────────────────────────────────────────────────────
    public static function index(): void
    {
        requireAuth();
        $pdo = Database::connect();
        self::ensureTable($pdo);

        $tahun = (int)(query('tahun') ?? date('Y'));
        $bulan = (int)(query('bulan') ?? 0); // 0 = semua bulan

        // ── 1. Deadline dari tugas_kegiatan yang belum selesai ─────────────
        $where  = ['t.tahun = ?', 't.deadline IS NOT NULL', 't.sampel_selesai < t.target_sampel'];
        $params = [$tahun];
        if ($bulan) {
            $where[]  = 'MONTH(t.deadline) = ?';
            $params[] = $bulan;
        }
        $whereSql = 'WHERE ' . implode(' AND ', $where);

        $stmtD = $pdo->prepare("
            SELECT
                CONCAT('tugas-', t.id) AS id,
                ms.nama_survei AS judul,
                t.deadline AS tanggal,
                NULL AS tanggal_selesai,
                'deadline' AS tipe,
                CONCAT(p.nama, ' – ', mw.desa_kelurahan) AS keterangan,
                t.id AS tugas_id
            FROM tugas_kegiatan t
            JOIN master_survei  ms ON ms.id = t.survei_id
            JOIN petugas         p  ON p.id  = t.petugas_id
            JOIN master_wilayah  mw ON mw.id = t.wilayah_id
            $whereSql
            ORDER BY t.deadline ASC
        ");
        $stmtD->execute($params);
        $deadlines = $stmtD->fetchAll();

        // ── 2. Event manual dari agenda_event ──────────────────────────────
        $stmtE = $pdo->prepare("
            SELECT
                CONCAT('event-', e.id) AS id,
                e.judul, e.tanggal, e.tanggal_selesai,
                e.tipe, e.keterangan,
                NULL AS tugas_id
            FROM agenda_event e
            WHERE YEAR(e.tanggal) = ?
            " . ($bulan ? 'AND MONTH(e.tanggal) = ?' : '') . "
            ORDER BY e.tanggal ASC
        ");
        $stmtE->execute($bulan ? [$tahun, $bulan] : [$tahun]);
        $events = $stmtE->fetchAll();

        respond(true, [
            'deadlines' => $deadlines,
            'events'    => $events,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STORE — tambah event manual
    // ─────────────────────────────────────────────────────────────────────────
    public static function store(): void
    {
        requireAuth();
        $pdo  = Database::connect();
        self::ensureTable($pdo);

        $body = requestBody();

        if (empty($body['judul']) || empty($body['tanggal'])) {
            respond(false, null, 'Judul dan tanggal wajib diisi.', 422);
        }

        $userId = (int)($_SESSION['user']['id'] ?? 0) ?: null;
        $stmt = $pdo->prepare("
            INSERT INTO agenda_event (judul, tanggal, tanggal_selesai, tipe, keterangan, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            trim($body['judul']),
            $body['tanggal'],
            $body['tanggal_selesai'] ?? null,
            $body['tipe'] ?? 'umum',
            $body['keterangan'] ?? null,
            $userId,
        ]);
        $id = (int)$pdo->lastInsertId();

        $stmt2 = $pdo->prepare('SELECT * FROM agenda_event WHERE id = ?');
        $stmt2->execute([$id]);
        respond(true, $stmt2->fetch(), 'Event berhasil ditambahkan.', 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────
    public static function update(int $id): void
    {
        requireAuth();
        $pdo  = Database::connect();
        self::ensureTable($pdo);

        $body = requestBody();

        $stmt = $pdo->prepare('SELECT id FROM agenda_event WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) respond(false, null, 'Event tidak ditemukan.', 404);

        $cols = []; $params = [];
        foreach (['judul','tanggal','tanggal_selesai','tipe','keterangan','warna'] as $c) {
            if (array_key_exists($c, $body)) {
                $cols[]   = "$c = ?";
                $params[] = $body[$c] === '' ? null : $body[$c];
            }
        }
        if (empty($cols)) respond(false, null, 'Tidak ada perubahan.', 422);

        $params[] = $id;
        $pdo->prepare('UPDATE agenda_event SET ' . implode(', ', $cols) . ' WHERE id = ?')
            ->execute($params);

        $stmt2 = $pdo->prepare('SELECT * FROM agenda_event WHERE id = ?');
        $stmt2->execute([$id]);
        respond(true, $stmt2->fetch(), 'Event diperbarui.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────
    public static function delete(int $id): void
    {
        requireAuth();
        $pdo = Database::connect();
        self::ensureTable($pdo);

        $stmt = $pdo->prepare('SELECT id FROM agenda_event WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) respond(false, null, 'Event tidak ditemukan.', 404);

        $pdo->prepare('DELETE FROM agenda_event WHERE id = ?')->execute([$id]);
        respond(true, null, 'Event dihapus.');
    }
}
