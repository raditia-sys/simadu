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

        // ── 1. Ambil semua deadline unik per survei per periode ──────────────
        // Aggregate: satu event per survei+periode (bukan per petugas)
        // Hanya ambil tugas yang belum selesai sepenuhnya
        $whereSql  = 'WHERE t.tahun = ? AND t.deadline IS NOT NULL
                      AND ms.deadline_hari IS NOT NULL';
        $params    = [$tahun];
        if ($bulan) {
            $whereSql .= ' AND MONTH(t.deadline) = ?';
            $params[]  = $bulan;
        }

        $stmtD = $pdo->prepare("
            SELECT DISTINCT
                ms.id                      AS survei_id,
                ms.nama_survei,
                ms.jenis_periode,
                t.deadline,
                t.bulan                    AS t_bulan,
                t.triwulan_ke              AS t_triwulan,
                t.minggu_ke                AS t_minggu
            FROM tugas_kegiatan t
            JOIN master_survei ms ON ms.id = t.survei_id
            $whereSql
            ORDER BY t.deadline ASC
        ");
        $stmtD->execute($params);
        $uniqueDeadlines = $stmtD->fetchAll();

        // ── Build reminder events dari setiap deadline unik ─────────────────
        $reminders = [];
        foreach ($uniqueDeadlines as $dl) {
            $deadlineDate = new DateTime($dl['deadline']);
            $surveiNama   = $dl['nama_survei'];
            $jenis        = $dl['jenis_periode'];

            // Label periode
            $periodeLabel = '';
            if ($dl['t_bulan']) {
                $bNames = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
                $periodeLabel = $bNames[(int)$dl['t_bulan']];
                if ($dl['t_minggu']) $periodeLabel .= " Mggu {$dl['t_minggu']}";
            } elseif ($dl['t_triwulan']) {
                $periodeLabel = "TW {$dl['t_triwulan']}";
            }

            // Tentukan reminder hari sesuai jenis_periode
            // Mingguan: hanya H-3 dan H
            // Lainnya: H-5, H-3, dan H
            $reminderDays = ($jenis === 'mingguan') ? [3, 0] : [5, 3, 0];

            foreach ($reminderDays as $minus) {
                $eventDate = clone $deadlineDate;
                if ($minus > 0) $eventDate->modify("-{$minus} days");
                $eventDateStr = $eventDate->format('Y-m-d');

                // Filter bulan jika diminta
                if ($bulan && (int)$eventDate->format('n') !== $bulan) continue;
                // Filter tahun
                if ((int)$eventDate->format('Y') !== $tahun) continue;

                if ($minus === 0) {
                    $label = "⏰ Deadline Entri: {$surveiNama}";
                    $warna = 'danger';
                } elseif ($minus === 3) {
                    $label = "🔔 H-3 Deadline: {$surveiNama}";
                    $warna = 'orange';
                } else {
                    $label = "📅 H-5 Deadline: {$surveiNama}";
                    $warna = 'warning';
                }
                if ($periodeLabel) $label .= " ({$periodeLabel} {$tahun})";

                $key = "{$dl['survei_id']}-{$dl['deadline']}-{$minus}";
                $reminders[$key] = [
                    'id'             => "reminder-{$key}",
                    'judul'          => $label,
                    'tanggal'        => $eventDateStr,
                    'tanggal_selesai'=> null,
                    'tipe'           => $minus === 0 ? 'deadline' : 'reminder',
                    'keterangan'     => $periodeLabel ? "{$surveiNama} — Periode {$periodeLabel} {$tahun}" : "{$surveiNama} — Tahun {$tahun}",
                    'warna'          => $warna,
                    'survei_id'      => $dl['survei_id'],
                    'deadline_asli'  => $dl['deadline'],
                    'h_minus'        => $minus,
                ];
            }
        }

        // ── 2. Event manual dari agenda_event ──────────────────────────────
        $whereEvent = "WHERE (YEAR(e.tanggal) = ? OR (e.tanggal_selesai IS NOT NULL AND YEAR(e.tanggal_selesai) = ?))";
        $paramsEvent = [$tahun, $tahun];
        if ($bulan) {
            $firstDay = sprintf('%04d-%02d-01', $tahun, $bulan);
            $lastDay  = date('Y-m-t', strtotime($firstDay));
            $whereEvent .= " AND (
                MONTH(e.tanggal) = ?
                OR (e.tanggal_selesai IS NOT NULL AND MONTH(e.tanggal_selesai) = ?)
                OR (e.tanggal <= ? AND e.tanggal_selesai >= ?)
            )";
            $paramsEvent[] = $bulan;
            $paramsEvent[] = $bulan;
            $paramsEvent[] = $lastDay;
            $paramsEvent[] = $firstDay;
        }

        $stmtE = $pdo->prepare("
            SELECT
                CONCAT('event-', e.id) AS id,
                e.judul, e.tanggal, e.tanggal_selesai,
                e.tipe, e.keterangan, e.warna,
                NULL AS tugas_id
            FROM agenda_event e
            $whereEvent
            ORDER BY e.tanggal ASC
        ");
        $stmtE->execute($paramsEvent);
        $events = $stmtE->fetchAll();

        respond(true, [
            'deadlines' => array_values($reminders),
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
        $user = requireAuth();
        $pdo  = Database::connect();
        self::ensureTable($pdo);

        $body = requestBody();

        $stmt = $pdo->prepare('SELECT id, created_by FROM agenda_event WHERE id = ?');
        $stmt->execute([$id]);
        $event = $stmt->fetch();
        if (!$event) respond(false, null, 'Event tidak ditemukan.', 404);

        if ($user['role'] !== 'superadmin' && (int)($event['created_by'] ?? 0) !== (int)$user['id']) {
            respond(false, null, 'Anda tidak memiliki hak untuk mengubah event ini.', 403);
        }

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
        $user = requireAuth();
        $pdo = Database::connect();
        self::ensureTable($pdo);

        $stmt = $pdo->prepare('SELECT id, created_by FROM agenda_event WHERE id = ?');
        $stmt->execute([$id]);
        $event = $stmt->fetch();
        if (!$event) respond(false, null, 'Event tidak ditemukan.', 404);

        if ($user['role'] !== 'superadmin' && (int)($event['created_by'] ?? 0) !== (int)$user['id']) {
            respond(false, null, 'Anda tidak memiliki hak untuk menghapus event ini.', 403);
        }

        $pdo->prepare('DELETE FROM agenda_event WHERE id = ?')->execute([$id]);
        respond(true, null, 'Event dihapus.');
    }
}
