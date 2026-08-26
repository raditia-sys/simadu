<?php
/**
 * TugasKegiatanController — Entitas inti SIMADU.
 *
 * Role:
 * - GET list/detail  → semua auth user
 * - POST             → superadmin only
 * - PUT              → superadmin: semua field; admin: hanya sampel_selesai
 * - DELETE/bulk      → superadmin only
 * - Excel import/export/template → superadmin only (export: semua auth)
 */
class TugasKegiatanController
{
    // ── Kolom JOIN untuk SELECT ───────────────────────────────────────────────
    private const SELECT_COLS = '
        t.id,
        t.survei_id,   ms.nama_survei,    ms.kategori,        ms.jenis_periode,
        t.wilayah_id,  COALESCE(mw.kecamatan, "Lintas Wilayah") AS kecamatan, COALESCE(mw.desa_kelurahan, "Seluruh Wilayah") AS desa_kelurahan,
        t.petugas_id,  p.nama AS nama_petugas, p.tipe AS tipe_petugas,
        t.kegiatan_id, mk.nama AS nama_peran,
        t.pemeriksa_id, pm.nama AS nama_pemeriksa,
        t.tahun,       t.triwulan_ke,     t.bulan,            t.minggu_ke,
        t.target_sampel, t.sampel_selesai, t.catatan, t.deadline,
        t.created_by,  t.created_at,      t.updated_at
    ';

    private const FROM_JOIN = '
        FROM tugas_kegiatan t
        JOIN master_survei   ms ON ms.id = t.survei_id
        LEFT JOIN master_wilayah  mw ON mw.id = t.wilayah_id
        JOIN petugas          p  ON p.id  = t.petugas_id
        JOIN master_kegiatan mk  ON mk.id = t.kegiatan_id
        LEFT JOIN petugas    pm  ON pm.id = t.pemeriksa_id
    ';

    // ── Helper: compute status dari target & selesai ──────────────────────────
    private static function addStatus(array $row): array
    {
        $row['persen'] = calcPersen((int)$row['target_sampel'], (int)$row['sampel_selesai']);
        $row['status'] = calcStatus((int)$row['target_sampel'], (int)$row['sampel_selesai']);
        $row['periode_label'] = formatPeriode($row);
        return $row;
    }

    // ── Helper: build WHERE dari query params ─────────────────────────────────
    private static function buildWhere(): array
    {
        $where  = [];
        $params = [];

        if ($v = query('survei_id'))   { $where[] = 't.survei_id = ?';  $params[] = (int)$v; }
        if ($v = query('wilayah_id'))  { $where[] = 't.wilayah_id = ?'; $params[] = (int)$v; }
        if ($v = query('petugas_id'))  { $where[] = 't.petugas_id = ?'; $params[] = (int)$v; }
        if ($v = query('pemeriksa_id')){ $where[] = 't.pemeriksa_id = ?'; $params[] = (int)$v; }
        if ($v = query('kegiatan_id')) { $where[] = 't.kegiatan_id = ?';$params[] = (int)$v; }
        if ($v = query('kecamatan'))   {
            if ($v === '__none__' || $v === 'Lintas Wilayah' || $v === 'Non-Wilayah') {
                $where[] = 't.wilayah_id IS NULL';
            } else {
                $where[] = 'mw.kecamatan = ?';
                $params[] = $v;
            }
        }
        if ($v = query('tahun'))       { $where[] = 't.tahun = ?';      $params[] = (int)$v; }
        if ($v = query('bulan'))       { $where[] = 't.bulan = ?';      $params[] = (int)$v; }
        if ($v = query('triwulan_ke')) { $where[] = 't.triwulan_ke = ?';$params[] = (int)$v; }
        if ($v = query('minggu_ke'))   { $where[] = 't.minggu_ke = ?';  $params[] = (int)$v; }

        // deadline range
        if ($v = query('deadline_dari')) { $where[] = 't.deadline >= ?'; $params[] = $v; }
        if ($v = query('deadline_sampai')){ $where[] = 't.deadline <= ?'; $params[] = $v; }

        // status filter — dihitung di PHP setelah fetch, tapi kita bisa pre-filter di SQL
        if ($s = query('status')) {
            switch ($s) {
                case 'Belum Mulai': $where[] = 't.sampel_selesai = 0'; break;
                case 'Selesai':     $where[] = 't.sampel_selesai >= t.target_sampel AND t.target_sampel > 0'; break;
                case 'Berjalan':    $where[] = 't.sampel_selesai > 0 AND t.sampel_selesai < t.target_sampel'; break;
            }
        }

        if ($q = query('q')) {
            $like     = '%' . $q . '%';
            $where[]  = '(ms.nama_survei LIKE ? OR p.nama LIKE ? OR mw.desa_kelurahan LIKE ?)';
            $params[] = $like; $params[] = $like; $params[] = $like;
        }

        return [$where, $params];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIST
    // ─────────────────────────────────────────────────────────────────────────
    public static function index(): void
    {
        requireAuth();
        $pdo = Database::connect();
        [$where, $params] = self::buildWhere();

        $sql  = 'SELECT ' . self::SELECT_COLS . self::FROM_JOIN;
        $sql .= $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $sql .= ' ORDER BY t.tahun DESC, ms.nama_survei ASC, COALESCE(t.bulan, t.triwulan_ke * 3, 1) ASC, COALESCE(t.minggu_ke, 1) ASC, t.deadline ASC, COALESCE(mw.kecamatan, "ZZZ") ASC, COALESCE(mw.desa_kelurahan, "ZZZ") ASC, p.nama ASC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = array_map([self::class, 'addStatus'], $stmt->fetchAll());
        respond(true, $rows);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SHOW
    // ─────────────────────────────────────────────────────────────────────────
    public static function show(int $id): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $stmt = $pdo->prepare('SELECT ' . self::SELECT_COLS . self::FROM_JOIN . ' WHERE t.id = ?');
        $stmt->execute([$id]);
        $row  = $stmt->fetch();
        if (!$row) respond(false, null, 'Data tugas tidak ditemukan.', 404);
        respond(true, self::addStatus($row));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STORE
    // ─────────────────────────────────────────────────────────────────────────
    public static function store(): void
    {
        $user = requireRole('superadmin');
        $body = requestBody();
        validateRequired($body, [
            'survei_id'    => 'Survei',
            'petugas_id'   => 'Petugas',
            'kegiatan_id'  => 'Peran Kegiatan',
            'tahun'        => 'Tahun',
            'target_sampel'=> 'Target Sampel',
            'deadline'     => 'Deadline',
        ]);

        $wilayahId = !empty($body['wilayah_id']) ? (int)$body['wilayah_id'] : null;
        $pdo = Database::connect();

        // Ambil jenis_periode survei untuk validasi
        $stmtS = $pdo->prepare('SELECT jenis_periode FROM master_survei WHERE id = ?');
        $stmtS->execute([(int)$body['survei_id']]);
        $survei = $stmtS->fetch();
        if (!$survei) respond(false, null, 'Survei tidak ditemukan.', 404);

        $periodeFields = self::validatePeriodeFields($body, $survei['jenis_periode']);

        // Validasi pemeriksa jika diisi (harus tipe pegawai)
        $pemeriksaId = null;
        if (!empty($body['pemeriksa_id'])) {
            $stmtP = $pdo->prepare("SELECT id FROM petugas WHERE id = ? AND tipe = 'pegawai'");
            $stmtP->execute([(int)$body['pemeriksa_id']]);
            if (!$stmtP->fetch()) respond(false, null, 'Pemeriksa harus bertipe pegawai.', 422);
            $pemeriksaId = (int)$body['pemeriksa_id'];
        }

        // Unique constraint check
        self::checkUnique($pdo, $body, $periodeFields, $survei['jenis_periode']);

        $stmt = $pdo->prepare(
            'INSERT INTO tugas_kegiatan
             (survei_id, wilayah_id, petugas_id, kegiatan_id, tahun,
              triwulan_ke, bulan, minggu_ke, target_sampel, sampel_selesai,
              catatan, deadline, pemeriksa_id, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            (int)$body['survei_id'],   $wilayahId,
            (int)$body['petugas_id'],  (int)$body['kegiatan_id'],
            (int)$body['tahun'],
            $periodeFields['triwulan_ke'], $periodeFields['bulan'], $periodeFields['minggu_ke'],
            (int)$body['target_sampel'],
            (int)($body['sampel_selesai'] ?? 0),
            !empty($body['catatan']) ? trim((string)$body['catatan']) : null,
            $body['deadline'],
            $pemeriksaId,
            $user['id'],
        ]);
        $id = (int)$pdo->lastInsertId();
        logActivity($pdo, (int)$user['id'], 'create_tugas', 'tugas_kegiatan', $id);

        $stmt2 = $pdo->prepare('SELECT ' . self::SELECT_COLS . self::FROM_JOIN . ' WHERE t.id = ?');
        $stmt2->execute([$id]);
        respond(true, self::addStatus($stmt2->fetch()), 'Data tugas berhasil ditambahkan.', 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ALOKASI TAHUNAN — generate semua periode dalam satu tahun
    // ─────────────────────────────────────────────────────────────────────────
    public static function alokasiTahunan(): void
    {
        $user = requireRole('superadmin');
        $body = requestBody();
        $pdo  = Database::connect();

        $items = !empty($body['items']) && is_array($body['items']) ? $body['items'] : [$body];
        $force = !empty($body['force']);
        $requireConfirmItems = [];

        // First pass: validasi dan cek duplikasi jika !force
        foreach ($items as $idx => $item) {
            validateRequired($item, [
                'survei_id'    => 'Survei',
                'petugas_id'   => 'Petugas',
                'kegiatan_id'  => 'Peran Kegiatan',
                'tahun'        => 'Tahun',
                'target_sampel'=> 'Target Sampel',
            ]);

            if (!$force) {
                $svId  = (int)$item['survei_id'];
                $wlId  = !empty($item['wilayah_id']) ? (int)$item['wilayah_id'] : null;
                $ptId  = (int)$item['petugas_id'];
                $kgId  = (int)$item['kegiatan_id'];
                $tahun = (int)$item['tahun'];

                $stmtExisting = $pdo->prepare('
                    SELECT COUNT(*) AS total_existing, 
                           GROUP_CONCAT(DISTINCT COALESCE(p2.nama, "Tanpa Pemeriksa") SEPARATOR ", ") AS existing_pemeriksa,
                           p.nama AS nama_petugas
                    FROM tugas_kegiatan t
                    JOIN petugas p ON p.id = t.petugas_id
                    LEFT JOIN petugas p2 ON p2.id = t.pemeriksa_id
                    WHERE t.survei_id = ? AND t.wilayah_id <=> ? AND t.petugas_id = ? AND t.kegiatan_id = ? AND t.tahun = ?
                ');
                $stmtExisting->execute([$svId, $wlId, $ptId, $kgId, $tahun]);
                $existingInfo = $stmtExisting->fetch();
                $totalExisting = (int)($existingInfo['total_existing'] ?? 0);

                if ($totalExisting > 0) {
                    $requireConfirmItems[] = [
                        'item_index'        => $idx,
                        'existing_count'    => $totalExisting,
                        'nama_petugas'      => $existingInfo['nama_petugas'] ?? 'Petugas',
                        'existing_pemeriksa'=> $existingInfo['existing_pemeriksa'] ?: 'Belum ditentukan',
                    ];
                }
            }
        }

        if (!$force && !empty($requireConfirmItems)) {
            $totalCount = array_sum(array_column($requireConfirmItems, 'existing_count'));
            $names = implode(', ', array_unique(array_column($requireConfirmItems, 'nama_petugas')));
            respond(true, [
                'require_confirm'   => true,
                'existing_count'    => $totalCount,
                'existing_items'    => $requireConfirmItems,
                'existing_pemeriksa'=> $requireConfirmItems[0]['existing_pemeriksa'] ?? 'Belum ditentukan',
                'message'           => "Terdeteksi {$totalCount} tugas sebelumnya untuk {$names}.",
            ]);
        }

        // Cache master survei
        $surveiCache = [];
        $stmtS = $pdo->prepare('SELECT id, kode_survei, nama_survei, jenis_periode, bulan_mulai, bulan_selesai, deadline_hari, deadline_hari_mg2 FROM master_survei WHERE id = ?');

        // Statements
        $stmtCheck = $pdo->prepare(
            'SELECT id FROM tugas_kegiatan
             WHERE survei_id=? AND wilayah_id <=> ? AND petugas_id=? AND kegiatan_id=? AND tahun=?
             AND pemeriksa_id <=> ?
             AND bulan <=> ?
             AND triwulan_ke <=> ?
             AND minggu_ke <=> ?'
        );
        $stmtInsert = $pdo->prepare(
            'INSERT INTO tugas_kegiatan
             (survei_id, wilayah_id, petugas_id, kegiatan_id, tahun,
              triwulan_ke, bulan, minggu_ke, target_sampel, sampel_selesai,
              deadline, pemeriksa_id, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );

        $inserted = 0;
        $skipped  = 0;
        $insertedIds = [];

        try {
            $pdo->beginTransaction();

            foreach ($items as $item) {
                $svId   = (int)$item['survei_id'];
                $wlId   = !empty($item['wilayah_id']) ? (int)$item['wilayah_id'] : null;
                $ptId   = (int)$item['petugas_id'];
                $kgId   = (int)$item['kegiatan_id'];
                $tahun  = (int)$item['tahun'];
                $target = (int)$item['target_sampel'];

                if (!isset($surveiCache[$svId])) {
                    $stmtS->execute([$svId]);
                    $sRow = $stmtS->fetch();
                    if (!$sRow) respond(false, null, "Survei ID {$svId} tidak ditemukan.", 404);
                    $surveiCache[$svId] = $sRow;
                }
                $survei = $surveiCache[$svId];

                $jenis           = $survei['jenis_periode'];
                $bulanSelesai    = !empty($survei['bulan_selesai']) ? (int)$survei['bulan_selesai'] : 12;
                $deadlineHari    = $survei['deadline_hari'] ? (int)$survei['deadline_hari'] : null;
                $deadlineHariMg2 = !empty($survei['deadline_hari_mg2']) ? (int)$survei['deadline_hari_mg2'] : null;

                $pemeriksaId = null;
                if (!empty($item['pemeriksa_id'])) {
                    $pemeriksaId = (int)$item['pemeriksa_id'];
                }

                $periods = [];
                switch ($jenis) {
                    case 'tahunan':
                        $periods[] = ['bulan' => null, 'triwulan_ke' => null, 'minggu_ke' => null];
                        break;
                    case 'bulanan':
                        for ($b = 1; $b <= 12; $b++) {
                            $periods[] = ['bulan' => $b, 'triwulan_ke' => null, 'minggu_ke' => null];
                        }
                        break;
                    case 'triwulanan':
                        for ($tw = 1; $tw <= 4; $tw++) {
                            $periods[] = ['bulan' => null, 'triwulan_ke' => $tw, 'minggu_ke' => null];
                        }
                        break;
                    case 'mingguan':
                        for ($b = 1; $b <= 12; $b++) {
                            for ($mg = 1; $mg <= 2; $mg++) {
                                $periods[] = ['bulan' => $b, 'triwulan_ke' => null, 'minggu_ke' => $mg];
                            }
                        }
                        break;
                }

                $isSAPB = ((int)($survei['id'] ?? 0) === 1
                    || strtoupper($survei['kode_survei'] ?? '') === 'SAPB'
                    || stripos($survei['nama_survei'] ?? '', 'SAPB') !== false
                    || stripos($survei['nama_survei'] ?? '', 'Angkutan Penumpang') !== false);

                $calcDeadline = function(array $p) use ($tahun, $jenis, $bulanSelesai, $deadlineHari, $deadlineHariMg2, $isSAPB): string {
                    switch ($jenis) {
                        case 'tahunan': {
                            $bl = str_pad((string)$bulanSelesai, 2, '0', STR_PAD_LEFT);
                            $maxHari = (int)date('t', strtotime(sprintf('%04d-%02d-01', $tahun, $bulanSelesai)));
                            $d = $deadlineHari ? min((int)$deadlineHari, $maxHari) : $maxHari;
                            $hari = str_pad((string)$d, 2, '0', STR_PAD_LEFT);
                            return "{$tahun}-{$bl}-{$hari}";
                        }
                        case 'bulanan': {
                            $bulan = (int)($p['bulan'] ?? 1);
                            $bl = str_pad((string)$bulan, 2, '0', STR_PAD_LEFT);
                            $maxHari = (int)date('t', strtotime(sprintf('%04d-%02d-01', $tahun, $bulan)));
                            $d = $deadlineHari ? min((int)$deadlineHari, $maxHari) : $maxHari;
                            $hari = str_pad((string)$d, 2, '0', STR_PAD_LEFT);
                            return "{$tahun}-{$bl}-{$hari}";
                        }
                        case 'mingguan': {
                            $bulan = (int)($p['bulan'] ?? 1);
                            $bl = str_pad((string)$bulan, 2, '0', STR_PAD_LEFT);
                            $maxHari = (int)date('t', strtotime(sprintf('%04d-%02d-01', $tahun, $bulan)));
                            $isMg2 = ((int)($p['minggu_ke'] ?? 1)) === 2;
                            $dl = ($isMg2 && $deadlineHariMg2) ? $deadlineHariMg2 : $deadlineHari;
                            $d = $dl ? min((int)$dl, $maxHari) : $maxHari;
                            $hari = str_pad((string)$d, 2, '0', STR_PAD_LEFT);
                            return "{$tahun}-{$bl}-{$hari}";
                        }
                        case 'triwulanan': {
                            $tw = (int)($p['triwulan_ke'] ?? 1);
                            if ($isSAPB) {
                                // Khusus SAPB: TW1 (15 April), TW2 (15 Juli), TW3 (15 Oktober), TW4 (15 Jan tahun berikutnya)
                                $d = $deadlineHari ? (int)$deadlineHari : 15;
                                $hari = str_pad((string)$d, 2, '0', STR_PAD_LEFT);
                                switch ($tw) {
                                    case 1: return sprintf('%04d-04-%s', $tahun, $hari);
                                    case 2: return sprintf('%04d-07-%s', $tahun, $hari);
                                    case 3: return sprintf('%04d-10-%s', $tahun, $hari);
                                    case 4: return sprintf('%04d-01-%s', $tahun + 1, $hari);
                                    default: return sprintf('%04d-04-%s', $tahun, $hari);
                                }
                            }
                            $bulanAkhir = $tw * 3;
                            $bl = str_pad((string)$bulanAkhir, 2, '0', STR_PAD_LEFT);
                            $maxHari = (int)date('t', strtotime(sprintf('%04d-%02d-01', $tahun, $bulanAkhir)));
                            $d = $deadlineHari ? min((int)$deadlineHari, $maxHari) : $maxHari;
                            $hari = str_pad((string)$d, 2, '0', STR_PAD_LEFT);
                            return "{$tahun}-{$bl}-{$hari}";
                        }
                        default: {
                            return "{$tahun}-12-31";
                        }
                    }
                };

                foreach ($periods as $p) {
                    if (!$force) {
                        $stmtCheck->execute([
                            $svId, $wlId, $ptId, $kgId, $tahun,
                            $pemeriksaId,
                            $p['bulan'],
                            $p['triwulan_ke'],
                            $p['minggu_ke'],
                        ]);
                        if ($stmtCheck->fetch()) { $skipped++; continue; }
                    }

                    $deadline = $calcDeadline($p);
                    $stmtInsert->execute([
                        $svId, $wlId, $ptId, $kgId, $tahun,
                        $p['triwulan_ke'], $p['bulan'], $p['minggu_ke'],
                        $target, 0,
                        $deadline,
                        $pemeriksaId,
                        $user['id'],
                    ]);
                    $insertedIds[] = (int)$pdo->lastInsertId();
                    $inserted++;
                }
            }

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            respond(false, null, 'Gagal mengalokasikan tugas: ' . $e->getMessage(), 500);
        }

        if ($inserted > 0) {
            $allocCount = count($items);
            logActivity($pdo, (int)$user['id'], 'alokasi_tahunan', 'tugas_kegiatan', null,
                "{$inserted} tugas di-generate ({$allocCount} alokasi)");
        }

        // Ambil data baris yang baru diinsert
        $rows = [];
        if (!empty($insertedIds)) {
            $ph   = implode(',', array_fill(0, count($insertedIds), '?'));
            $stmtR = $pdo->prepare('SELECT ' . self::SELECT_COLS . self::FROM_JOIN . " WHERE t.id IN ({$ph}) ORDER BY t.tahun DESC, t.bulan, t.triwulan_ke, t.minggu_ke");
            $stmtR->execute(array_values($insertedIds));
            $rows = array_map([self::class, 'addStatus'], $stmtR->fetchAll());
        }

        $msg = "{$inserted} tugas berhasil di-generate" . ($skipped ? ", {$skipped} sudah ada (dilewati)." : '.');
        respond(true, ['inserted' => $inserted, 'skipped' => $skipped, 'rows' => $rows, 'allocations_count' => count($items)], $msg, 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────
    public static function update(int $id): void
    {
        $user = requireRole('superadmin', 'admin');
        $body = requestBody();
        $pdo  = Database::connect();

        // Cek row ada
        $stmtE = $pdo->prepare('SELECT t.*, ms.jenis_periode FROM tugas_kegiatan t JOIN master_survei ms ON ms.id = t.survei_id WHERE t.id = ?');
        $stmtE->execute([$id]);
        $existing = $stmtE->fetch();
        if (!$existing) respond(false, null, 'Data tugas tidak ditemukan.', 404);

        if ($user['role'] === 'admin' || (!isset($body['survei_id']) && (isset($body['sampel_selesai']) || array_key_exists('catatan', $body)))) {
            // Update sampel_selesai dan/atau catatan
            $selesai = isset($body['sampel_selesai']) ? max(0, (int)$body['sampel_selesai']) : (int)$existing['sampel_selesai'];
            $catatan = array_key_exists('catatan', $body) ? (trim((string)$body['catatan']) ?: null) : $existing['catatan'];
            $pdo->prepare('UPDATE tugas_kegiatan SET sampel_selesai = ?, catatan = ?, updated_at = NOW() WHERE id = ?')
                ->execute([$selesai, $catatan, $id]);
            logActivity($pdo, (int)$user['id'], 'update_selesai_tugas', 'tugas_kegiatan', $id, "sampel_selesai={$selesai}");
        } elseif ($user['role'] === 'superadmin') {
            // Superadmin: update semua field
            validateRequired($body, [
                'survei_id' => 'Survei',
                'petugas_id' => 'Petugas', 'kegiatan_id' => 'Peran',
                'tahun' => 'Tahun', 'target_sampel' => 'Target Sampel', 'deadline' => 'Deadline',
            ]);

            $wilayahId = !empty($body['wilayah_id']) ? (int)$body['wilayah_id'] : null;
            $stmtS = $pdo->prepare('SELECT jenis_periode FROM master_survei WHERE id = ?');
            $stmtS->execute([(int)$body['survei_id']]);
            $survei = $stmtS->fetch();
            if (!$survei) respond(false, null, 'Survei tidak ditemukan.', 404);

            $periodeFields = self::validatePeriodeFields($body, $survei['jenis_periode']);
            self::checkUnique($pdo, $body, $periodeFields, $survei['jenis_periode'], $id);

            // Validasi pemeriksa jika diisi
            $pemeriksaId = null;
            if (!empty($body['pemeriksa_id'])) {
                $stmtP = $pdo->prepare("SELECT id FROM petugas WHERE id = ? AND tipe = 'pegawai'");
                $stmtP->execute([(int)$body['pemeriksa_id']]);
                if (!$stmtP->fetch()) respond(false, null, 'Pemeriksa harus bertipe pegawai.', 422);
                $pemeriksaId = (int)$body['pemeriksa_id'];
            }

            $catatan = array_key_exists('catatan', $body) ? (trim((string)$body['catatan']) ?: null) : $existing['catatan'];

            $pdo->prepare(
                'UPDATE tugas_kegiatan SET
                 survei_id=?, wilayah_id=?, petugas_id=?, kegiatan_id=?,
                 tahun=?, triwulan_ke=?, bulan=?, minggu_ke=?,
                 target_sampel=?, sampel_selesai=?, catatan=?, deadline=?, pemeriksa_id=?, updated_at=NOW()
                 WHERE id=?'
            )->execute([
                (int)$body['survei_id'], $wilayahId,
                (int)$body['petugas_id'], (int)$body['kegiatan_id'],
                (int)$body['tahun'],
                $periodeFields['triwulan_ke'], $periodeFields['bulan'], $periodeFields['minggu_ke'],
                (int)$body['target_sampel'],
                max(0, (int)($body['sampel_selesai'] ?? 0)),
                $catatan,
                $body['deadline'],
                $pemeriksaId,
                $id,
            ]);
            logActivity($pdo, (int)$user['id'], 'update_tugas', 'tugas_kegiatan', $id);
        } else {
            respond(false, null, 'Akses ditolak.', 403);
        }

        $stmt2 = $pdo->prepare('SELECT ' . self::SELECT_COLS . self::FROM_JOIN . ' WHERE t.id = ?');
        $stmt2->execute([$id]);
        respond(true, self::addStatus($stmt2->fetch()), 'Data tugas berhasil diperbarui.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DESTROY
    // ─────────────────────────────────────────────────────────────────────────
    public static function destroy(int $id): void
    {
        $user = requireRole('superadmin');
        $pdo  = Database::connect();

        $stmt = $pdo->prepare('SELECT id FROM tugas_kegiatan WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) respond(false, null, 'Data tugas tidak ditemukan.', 404);

        $pdo->prepare('DELETE FROM tugas_kegiatan WHERE id = ?')->execute([$id]);
        logActivity($pdo, (int)$user['id'], 'hapus_tugas', 'tugas_kegiatan', $id);
        respond(true, null, 'Data tugas berhasil dihapus.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BULK DESTROY (superadmin only)
    // ─────────────────────────────────────────────────────────────────────────
    public static function bulkDestroy(): void
    {
        $user = requireRole('superadmin');
        $body = requestBody();
        $ids  = array_filter(array_map('intval', $body['ids'] ?? []), fn($v) => $v > 0);
        if (empty($ids)) respond(false, null, 'Tidak ada ID yang dipilih.', 422);

        $pdo  = Database::connect();
        $ph   = implode(',', array_fill(0, count($ids), '?'));
        $pdo->prepare("DELETE FROM tugas_kegiatan WHERE id IN ($ph)")->execute(array_values($ids));
        logActivity($pdo, (int)$user['id'], 'bulk_hapus_tugas', 'tugas_kegiatan', null, count($ids).' tugas dihapus');
        respond(true, null, count($ids) . ' data tugas berhasil dihapus.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BULK MARK SELESAI
    // ─────────────────────────────────────────────────────────────────────────
    public static function bulkSelesai(): void
    {
        $user = requireRole('superadmin', 'admin');
        $body = requestBody();
        $ids  = array_filter(array_map('intval', $body['ids'] ?? []), fn($v) => $v > 0);
        if (empty($ids)) respond(false, null, 'Tidak ada ID yang dipilih.', 422);

        $pdo = Database::connect();
        $ph  = implode(',', array_fill(0, count($ids), '?'));
        // Set sampel_selesai = target_sampel untuk semua ID terpilih
        $pdo->prepare("UPDATE tugas_kegiatan SET sampel_selesai = target_sampel, updated_at = NOW() WHERE id IN ($ph)")
            ->execute(array_values($ids));
        logActivity($pdo, (int)$user['id'], 'bulk_selesai_tugas', 'tugas_kegiatan', null, count($ids).' tugas diselesaikan');
        respond(true, null, count($ids) . ' data tugas ditandai selesai.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DOWNLOAD TEMPLATE EXCEL
    // ─────────────────────────────────────────────────────────────────────────
    public static function downloadTemplate(): void
    {
        requireAuth();
        require_once ROOT_DIR . '/vendor/autoload.php';
        $spreadsheet = self::buildTemplateSpreadsheet();
        self::streamExcel($spreadsheet, 'template_tugas_kegiatan.xlsx');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // IMPORT EXCEL
    // ─────────────────────────────────────────────────────────────────────────
    public static function importExcel(): void
    {
        $user = requireRole('superadmin');
        require_once ROOT_DIR . '/vendor/autoload.php';

        if (empty($_FILES['file'])) respond(false, null, 'File tidak ditemukan. Gunakan multipart/form-data.', 422);
        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) respond(false, null, 'Upload error: ' . $file['error'], 422);

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['xlsx', 'xls'], true)) respond(false, null, 'Format file harus .xlsx atau .xls.', 422);

        $pdo = Database::connect();

        // Cache lookup tables
        $surveys   = self::buildLookup($pdo, 'SELECT id, nama_survei, jenis_periode FROM master_survei');
        $wilayahs  = self::buildLookup2($pdo, 'SELECT id, kecamatan, desa_kelurahan FROM master_wilayah');
        $petugass  = self::buildLookup($pdo, 'SELECT id, nama FROM petugas', 'nama');
        $kegiatans = self::buildLookup($pdo, 'SELECT id, nama FROM master_kegiatan', 'nama');

        try {
            $reader      = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($file['tmp_name']);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($file['tmp_name']);
            $sheet       = $spreadsheet->getActiveSheet();
        } catch (Throwable $e) {
            respond(false, null, 'Gagal membaca file Excel.', 422);
        }

        $headers = [
            'Nama Survei', 'Kecamatan', 'Desa/Kelurahan', 'Nama Petugas',
            'Nama Peran', 'Tahun', 'Bulan', 'Triwulan Ke', 'Minggu Ke',
            'Target Sampel', 'Sampel Selesai', 'Deadline (YYYY-MM-DD)',
        ];

        $imported = 0;
        $failed   = 0;
        $errors   = [];

        $highestRow = $sheet->getHighestRow();

        for ($r = 2; $r <= $highestRow; $r++) {
            $row = [];
            foreach (range('A', 'L') as $i => $col) {
                $row[$headers[$i]] = trim((string)$sheet->getCell($col . $r)->getValue());
            }

            // Skip baris kosong
            if ($row['Nama Survei'] === '' && $row['Nama Petugas'] === '') continue;

            try {
                // Lookup survei
                $surveiKey = mb_strtolower($row['Nama Survei']);
                if (!isset($surveys[$surveiKey])) {
                    throw new RuntimeException("Survei \"{$row['Nama Survei']}\" tidak ditemukan.");
                }
                $survei     = $surveys[$surveiKey];
                $survei_id  = (int)$survei['id'];
                $jenis      = $survei['jenis_periode'];

                // Lookup wilayah
                $wilayahKey = mb_strtolower($row['Kecamatan'] . '||' . $row['Desa/Kelurahan']);
                if (!isset($wilayahs[$wilayahKey])) {
                    throw new RuntimeException("Wilayah \"{$row['Kecamatan']} / {$row['Desa/Kelurahan']}\" tidak ditemukan.");
                }
                $wilayah_id = (int)$wilayahs[$wilayahKey]['id'];

                // Lookup petugas
                $petugasKey = mb_strtolower($row['Nama Petugas']);
                if (!isset($petugass[$petugasKey])) {
                    throw new RuntimeException("Petugas \"{$row['Nama Petugas']}\" tidak ditemukan.");
                }
                $petugas_id = (int)$petugass[$petugasKey]['id'];

                // Lookup peran
                $peranKey = mb_strtolower($row['Nama Peran']);
                if (!isset($kegiatans[$peranKey])) {
                    throw new RuntimeException("Peran \"{$row['Nama Peran']}\" tidak ditemukan.");
                }
                $kegiatan_id = (int)$kegiatans[$peranKey]['id'];

                $tahun = (int)$row['Tahun'];
                if ($tahun < 2000 || $tahun > 2100) throw new RuntimeException('Tahun tidak valid.');

                // Periode fields berdasarkan jenis
                $triwulan_ke = $bulan = $minggu_ke = null;
                switch ($jenis) {
                    case 'mingguan':
                        $bulan     = (int)$row['Bulan'];
                        $minggu_ke = (int)$row['Minggu Ke'];
                        if ($bulan < 1 || $bulan > 12)   throw new RuntimeException('Bulan tidak valid (1-12).');
                        if (!in_array($minggu_ke, [1,2])) throw new RuntimeException('Minggu Ke hanya boleh 1 atau 2.');
                        break;
                    case 'bulanan':
                        $bulan = (int)$row['Bulan'];
                        if ($bulan < 1 || $bulan > 12) throw new RuntimeException('Bulan tidak valid (1-12).');
                        break;
                    case 'triwulanan':
                        $triwulan_ke = (int)$row['Triwulan Ke'];
                        if ($triwulan_ke < 1 || $triwulan_ke > 4) throw new RuntimeException('Triwulan Ke tidak valid (1-4).');
                        break;
                    // tahunan: semua null
                }

                $target  = max(0, (int)$row['Target Sampel']);
                $selesai = max(0, (int)$row['Sampel Selesai']);

                // Deadline parsing (mendukung Excel numeric date, DateTime object, dan string berbagai format)
                $rawDeadline = $sheet->getCell('L' . $r)->getValue();
                $deadline = null;

                if (is_numeric($rawDeadline) && (float)$rawDeadline > 1000) {
                    // Excel serial date number
                    $deadline = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float)$rawDeadline)->format('Y-m-d');
                } elseif ($rawDeadline instanceof \DateTimeInterface) {
                    $deadline = $rawDeadline->format('Y-m-d');
                } else {
                    $strDeadline = trim((string)$rawDeadline);
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $strDeadline)) {
                        $deadline = $strDeadline;
                    } elseif (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/', $strDeadline, $m)) {
                        // format d/m/Y atau d-m-Y
                        $deadline = sprintf('%04d-%02d-%02d', (int)$m[3], (int)$m[2], (int)$m[1]);
                    } elseif ($ts = strtotime($strDeadline)) {
                        $deadline = date('Y-m-d', $ts);
                    }
                }

                if (!$deadline || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $deadline)) {
                    throw new RuntimeException('Format deadline tidak valid (contoh: 2026-03-15 atau 15/03/2026).');
                }

                // Insert
                $pdo->prepare(
                    'INSERT INTO tugas_kegiatan
                     (survei_id, wilayah_id, petugas_id, kegiatan_id, tahun,
                      triwulan_ke, bulan, minggu_ke, target_sampel, sampel_selesai,
                      deadline, created_by)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
                )->execute([$survei_id, $wilayah_id, $petugas_id, $kegiatan_id, $tahun,
                    $triwulan_ke, $bulan, $minggu_ke, $target, $selesai, $deadline, $user['id']]);

                $imported++;
            } catch (PDOException $e) {
                $failed++;
                error_log('Import Excel DB Error: ' . $e->getMessage());
                $errors[] = ['baris' => $r, 'pesan' => 'Gagal menyimpan ke database (duplikat atau format tidak sesuai).'];
            } catch (Throwable $e) {
                $failed++;
                $errors[] = ['baris' => $r, 'pesan' => $e->getMessage()];
            }
        }

        if ($imported > 0) {
            logActivity($pdo, (int)$user['id'], 'import_excel_tugas', 'tugas_kegiatan', null, $imported.' baris diimport');
        }

        respond(true, ['imported' => $imported, 'failed' => $failed, 'errors' => $errors],
            "{$imported} data berhasil diimpor" . ($failed ? ", {$failed} gagal." : '.'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EXPORT EXCEL
    // ─────────────────────────────────────────────────────────────────────────
    public static function exportExcel(): void
    {
        requireAuth();
        require_once ROOT_DIR . '/vendor/autoload.php';

        $pdo = Database::connect();
        [$where, $params] = self::buildWhere();

        $sql  = 'SELECT ' . self::SELECT_COLS . self::FROM_JOIN;
        $sql .= $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $sql .= ' ORDER BY t.tahun DESC, ms.nama_survei ASC, COALESCE(t.bulan, t.triwulan_ke * 3, 1) ASC, COALESCE(t.minggu_ke, 1) ASC, t.deadline ASC, COALESCE(mw.kecamatan, "ZZZ") ASC, COALESCE(mw.desa_kelurahan, "ZZZ") ASC, p.nama ASC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Export Tugas Kegiatan');

        // Header
        $exportHeaders = [
            'Nama Survei', 'Kategori', 'Kecamatan', 'Desa/Kelurahan', 'Nama Petugas',
            'Tipe Petugas', 'Nama Peran', 'Tahun', 'Bulan', 'Triwulan Ke', 'Minggu Ke',
            'Target Sampel', 'Sampel Selesai', '% Capaian', 'Status', 'Deadline',
        ];
        self::styleHeader($sheet, $exportHeaders);

        $sanitizeFormula = function (mixed $val): mixed {
            if (is_string($val) && preg_match('/^[=\+\-@\t\r]/', $val)) {
                return "'" . $val;
            }
            return $val;
        };

        // Data
        foreach ($rows as $i => $row) {
            $r = $i + 2;
            $pct = calcPersen((int)$row['target_sampel'], (int)$row['sampel_selesai']);
            $rowData = [
                $row['nama_survei'], $row['kategori'],
                $row['kecamatan'], $row['desa_kelurahan'],
                $row['nama_petugas'], $row['tipe_petugas'], $row['nama_peran'],
                $row['tahun'], $row['bulan'], $row['triwulan_ke'], $row['minggu_ke'],
                $row['target_sampel'], $row['sampel_selesai'], $pct . '%',
                calcStatus((int)$row['target_sampel'], (int)$row['sampel_selesai']),
                $row['deadline'],
            ];
            $sheet->fromArray(array_map($sanitizeFormula, $rowData), null, 'A' . $r);
        }

        self::autoWidth($sheet, count($exportHeaders));
        self::streamExcel($spreadsheet, 'export_tugas_kegiatan_' . date('Ymd_His') . '.xlsx');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private static function validatePeriodeFields(array $body, string $jenis): array
    {
        $result = ['triwulan_ke' => null, 'bulan' => null, 'minggu_ke' => null];
        switch ($jenis) {
            case 'mingguan':
                if (empty($body['bulan']) || (int)$body['bulan'] < 1 || (int)$body['bulan'] > 12) {
                    respond(false, null, 'Bulan wajib diisi (1-12) untuk survei mingguan.', 422);
                }
                if (!in_array((int)($body['minggu_ke'] ?? 0), [1, 2], true)) {
                    respond(false, null, 'Minggu Ke hanya boleh 1 atau 2 untuk survei mingguan.', 422);
                }
                $result['bulan']     = (int)$body['bulan'];
                $result['minggu_ke'] = (int)$body['minggu_ke'];
                break;
            case 'bulanan':
                if (empty($body['bulan']) || (int)$body['bulan'] < 1 || (int)$body['bulan'] > 12) {
                    respond(false, null, 'Bulan wajib diisi (1-12) untuk survei bulanan.', 422);
                }
                $result['bulan'] = (int)$body['bulan'];
                break;
            case 'triwulanan':
                if (empty($body['triwulan_ke']) || (int)$body['triwulan_ke'] < 1 || (int)$body['triwulan_ke'] > 4) {
                    respond(false, null, 'Triwulan Ke wajib diisi (1-4) untuk survei triwulanan.', 422);
                }
                $result['triwulan_ke'] = (int)$body['triwulan_ke'];
                break;
            // tahunan: semua null, tidak perlu validasi tambahan
        }
        return $result;
    }

    private static function checkUnique(
        PDO $pdo, array $body, array $periodeFields, string $jenis, ?int $excludeId = null
    ): void {
        if (!empty($body['force'])) return;
        $wilayahId = !empty($body['wilayah_id']) ? (int)$body['wilayah_id'] : null;
        $pemeriksaId = !empty($body['pemeriksa_id']) ? (int)$body['pemeriksa_id'] : null;
        $sql = 'SELECT id FROM tugas_kegiatan
                WHERE survei_id=? AND wilayah_id <=> ? AND petugas_id=? AND kegiatan_id=? AND tahun=?
                AND pemeriksa_id <=> ?';
        $params = [
            (int)$body['survei_id'], $wilayahId,
            (int)$body['petugas_id'], (int)$body['kegiatan_id'], (int)$body['tahun'],
            $pemeriksaId,
        ];

        switch ($jenis) {
            case 'mingguan':
                $sql .= ' AND bulan=? AND minggu_ke=?';
                $params[] = $periodeFields['bulan']; $params[] = $periodeFields['minggu_ke']; break;
            case 'bulanan':
                $sql .= ' AND bulan=?';
                $params[] = $periodeFields['bulan']; break;
            case 'triwulanan':
                $sql .= ' AND triwulan_ke=?';
                $params[] = $periodeFields['triwulan_ke']; break;
        }

        if ($excludeId !== null) { $sql .= ' AND id != ?'; $params[] = $excludeId; }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        if ($stmt->fetch()) {
            respond(false, null, 'Petugas ini sudah memiliki tugas dengan pemeriksa yang sama pada periode tersebut.', 409);
        }
    }

    /** Lookup table: nama_survei (lower) → row */
    private static function buildLookup(PDO $pdo, string $sql, string $keyCol = 'nama_survei'): array
    {
        $stmt = $pdo->query($sql);
        $map  = [];
        foreach ($stmt->fetchAll() as $row) {
            $map[mb_strtolower($row[$keyCol])] = $row;
        }
        return $map;
    }

    /** Lookup: "kecamatan||desa" (lower) → row */
    private static function buildLookup2(PDO $pdo, string $sql): array
    {
        $stmt = $pdo->query($sql);
        $map  = [];
        foreach ($stmt->fetchAll() as $row) {
            $key = mb_strtolower($row['kecamatan'] . '||' . $row['desa_kelurahan']);
            $map[$key] = $row;
        }
        return $map;
    }

    private static function buildTemplateSpreadsheet(): \PhpOffice\PhpSpreadsheet\Spreadsheet
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Tugas Kegiatan');

        $headers = [
            'Nama Survei', 'Kecamatan', 'Desa/Kelurahan', 'Nama Petugas',
            'Nama Peran', 'Tahun', 'Bulan', 'Triwulan Ke', 'Minggu Ke',
            'Target Sampel', 'Sampel Selesai', 'Deadline (YYYY-MM-DD)',
        ];
        self::styleHeader($sheet, $headers);

        // Baris contoh
        $sheet->fromArray([
            'SAPB', 'Muara Bulian', 'Terusan', 'Ahmad Fauzi', 'Petugas Pendataan',
            date('Y'), '1', '', '', '10', '0', date('Y') . '-03-31',
        ], null, 'A2');

        // Style baris contoh
        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle('A2:' . $lastCol . '2')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFE8ECF0');

        // Petunjuk di baris 3
        $sheet->setCellValue('A3', '--- isi data mulai baris ini ke bawah. Hapus baris contoh & petunjuk ini sebelum import. ---');
        $sheet->getStyle('A3')->getFont()->setItalic(true)->getColor()->setARGB('FF888888');
        $sheet->mergeCells('A3:L3');

        self::autoWidth($sheet, count($headers));
        return $spreadsheet;
    }

    private static function styleHeader(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, array $headers): void
    {
        $sheet->fromArray($headers, null, 'A1');
        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers));
        $headerRange = 'A1:' . $lastCol . '1';
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                       'startColor' => ['argb' => 'FF3E5C7E']],
            'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        ]);
        $sheet->getStyle($headerRange)->getBorders()->getAllBorders()
            ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);
    }

    private static function autoWidth(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet, int $count): void
    {
        foreach (range(1, $count) as $col) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }
    }

    private static function streamExcel(\PhpOffice\PhpSpreadsheet\Spreadsheet $spreadsheet, string $filename): never
    {
        // Bersihkan buffer output sebelum stream binary
        while (ob_get_level()) ob_end_clean();

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save('php://output');
        exit;
    }
}
