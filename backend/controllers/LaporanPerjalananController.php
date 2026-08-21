<?php
/**
 * LaporanPerjalananController — Wizard 3 Tahap Laporan Perjalanan Dinas.
 *
 * Tahap 1: store() / update()  — Data Perjalanan Dinas (status_pengisian = 'draft')
 * Tahap 2: saveRundown()       — Rundown Kegiatan
 * Tahap 3: uploadFoto()        — Upload dokumentasi foto
 *          selesai()           — Finalisasi + generate 3 .docx dalam 1 .zip
 *
 * Semua endpoint membutuhkan auth. Delete/selesai/download memerlukan pemilik atau superadmin.
 */
class LaporanPerjalananController
{
    // ─────────────────────────────────────────────────────────────────────────
    // HELPER: pastikan laporan ada dan kembalikan rownya
    // ─────────────────────────────────────────────────────────────────────────
    private static function findOrFail(PDO $pdo, int $id): array
    {
        $stmt = $pdo->prepare('SELECT * FROM laporan_perjalanan_dinas WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) respond(false, null, 'Laporan tidak ditemukan.', 404);
        return $row;
    }

    private static function authorizeOwnerOrAdmin(array $laporan): void
    {
        $currentUser = requireAuth();
        if ($currentUser['role'] !== 'superadmin' && (int)($laporan['created_by'] ?? 0) !== (int)$currentUser['id']) {
            respond(false, null, 'Anda tidak memiliki hak akses untuk data perjalanan dinas ini.', 403);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INDEX — daftar laporan
    // ─────────────────────────────────────────────────────────────────────────
    public static function index(): void
    {
        requireAuth();
        $pdo = Database::connect();

        $where  = [];
        $params = [];

        if ($petugas_id = query('petugas_id')) {
            $where[]  = 'lp.petugas_id = ?';
            $params[] = (int)$petugas_id;
        }
        if ($dari = query('dari')) {
            $where[]  = 'COALESCE(lp.tanggal_tugas, lp.tanggal_berangkat) >= ?';
            $params[] = $dari;
        }
        if ($sampai = query('sampai')) {
            $where[]  = 'COALESCE(lp.tanggal_tugas, lp.tanggal_kembali) <= ?';
            $params[] = $sampai;
        }
        if ($status = query('status')) {
            $where[]  = 'lp.status_pengisian = ?';
            $params[] = $status;
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $pdo->prepare("
            SELECT
                lp.id, lp.nomor_surat, lp.tanggal_surat_tugas, lp.tanggal_tugas, lp.tanggal_berangkat, lp.tanggal_kembali,
                lp.maksud_perjalanan, lp.biaya_transport, lp.status_pengisian, lp.created_at,
                p.nama AS nama_petugas, p.tipe AS tipe_petugas, p.jabatan, p.nip_atau_kode_mitra,
                mw.kecamatan, mw.desa_kelurahan, mw.rate_transport_lokal,
                ms.nama_survei,
                (SELECT COUNT(*) FROM laporan_perjalanan_dinas_rundown r WHERE r.laporan_id = lp.id) AS jumlah_rundown,
                (SELECT COUNT(*) FROM laporan_perjalanan_dinas_dokumentasi d WHERE d.laporan_id = lp.id) AS jumlah_foto
            FROM laporan_perjalanan_dinas lp
            JOIN petugas         p   ON p.id  = lp.petugas_id
            JOIN master_wilayah  mw  ON mw.id = lp.tujuan_wilayah_id
            LEFT JOIN master_survei ms ON ms.id = lp.survei_id
            $whereSql
            ORDER BY lp.created_at DESC
        ");
        $stmt->execute($params);
        respond(true, $stmt->fetchAll());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DETAIL — laporan + rundown + foto
    // ─────────────────────────────────────────────────────────────────────────
    public static function detail(int $id): void
    {
        requireAuth();
        $pdo = Database::connect();
        $row = self::findOrFail($pdo, $id);

        // Ambil data relasi
        $stmtP = $pdo->prepare('SELECT * FROM petugas WHERE id = ?');
        $stmtP->execute([$row['petugas_id']]);
        $row['petugas'] = $stmtP->fetch();

        $stmtW = $pdo->prepare('SELECT * FROM master_wilayah WHERE id = ?');
        $stmtW->execute([$row['tujuan_wilayah_id']]);
        $row['wilayah'] = $stmtW->fetch();

        if ($row['survei_id']) {
            $stmtS = $pdo->prepare('SELECT * FROM master_survei WHERE id = ?');
            $stmtS->execute([$row['survei_id']]);
            $row['survei'] = $stmtS->fetch();
        }

        // Rundown
        $stmtR = $pdo->prepare('SELECT * FROM laporan_perjalanan_dinas_rundown WHERE laporan_id = ? ORDER BY urutan ASC, id ASC');
        $stmtR->execute([$id]);
        $row['rundown'] = $stmtR->fetchAll();

        // Foto
        $stmtF = $pdo->prepare('SELECT * FROM laporan_perjalanan_dinas_dokumentasi WHERE laporan_id = ? ORDER BY urutan ASC, id ASC');
        $stmtF->execute([$id]);
        $row['foto'] = $stmtF->fetchAll();

        respond(true, $row);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STORE — Tahap 1: simpan sebagai draft
    // ─────────────────────────────────────────────────────────────────────────
    public static function store(): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        // Support single tanggal_tugas or legacy tanggal_berangkat
        $tglTugas = $body['tanggal_tugas'] ?? $body['tanggal_berangkat'] ?? null;
        $body['tanggal_tugas'] = $tglTugas;

        $required = [
            'petugas_id'        => 'Petugas',
            'tujuan_wilayah_id' => 'Wilayah Tujuan',
            'survei_id'         => 'Survei Terkait',
            'tanggal_tugas'     => 'Tanggal Tugas',
            'maksud_perjalanan' => 'Maksud Perjalanan',
        ];
        validateRequired($body, $required);

        // Auto-fill biaya dari rate wilayah jika tidak di-override
        $stmtW = $pdo->prepare('SELECT rate_transport_lokal FROM master_wilayah WHERE id = ?');
        $stmtW->execute([$body['tujuan_wilayah_id']]);
        $wilayah = $stmtW->fetch();
        if (!$wilayah) respond(false, null, 'Wilayah tujuan tidak ditemukan.', 422);

        $biaya = isset($body['biaya_transport']) && $body['biaya_transport'] !== ''
            ? (float)$body['biaya_transport']
            : ($wilayah['rate_transport_lokal'] ?? 0);

        $userId = $_SESSION['user']['id'] ?? null;

        $stmt = $pdo->prepare("
            INSERT INTO laporan_perjalanan_dinas
                (petugas_id, nomor_surat, tanggal_surat_tugas, tanggal_tugas, tujuan_wilayah_id, survei_id,
                 tanggal_berangkat, tanggal_kembali, maksud_perjalanan, biaya_transport,
                 status_pengisian, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NOW())
        ");
        $stmt->execute([
            (int)$body['petugas_id'],
            trim($body['nomor_surat'] ?? ''),
            $body['tanggal_surat_tugas'] ?? null,
            $tglTugas,
            (int)$body['tujuan_wilayah_id'],
            !empty($body['survei_id']) ? (int)$body['survei_id'] : null,
            $tglTugas,
            $tglTugas,
            trim($body['maksud_perjalanan']),
            $biaya,
            $userId,
        ]);
        $id = (int)$pdo->lastInsertId();

        logActivity($pdo, $userId, 'create_perjalanan', 'laporan_perjalanan_dinas', $id, "Draft baru");

        self::detail($id); // Langsung return detail lengkap
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE — Tahap 1: edit data perjalanan
    // ─────────────────────────────────────────────────────────────────────────
    public static function update(int $id): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $row  = self::findOrFail($pdo, $id);
        self::authorizeOwnerOrAdmin($row);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        // Jika wilayah berubah, recalculate biaya kecuali override manual
        if (!empty($body['tujuan_wilayah_id']) && !isset($body['biaya_transport'])) {
            $stmtW = $pdo->prepare('SELECT rate_transport_lokal FROM master_wilayah WHERE id = ?');
            $stmtW->execute([$body['tujuan_wilayah_id']]);
            $w = $stmtW->fetch();
            if ($w) $body['biaya_transport'] = $w['rate_transport_lokal'];
        }

        if (isset($body['tanggal_tugas'])) {
            $body['tanggal_berangkat'] = $body['tanggal_tugas'];
            $body['tanggal_kembali']   = $body['tanggal_tugas'];
        }

        $allowed = ['petugas_id','nomor_surat','tanggal_surat_tugas','tanggal_tugas','tujuan_wilayah_id',
                    'survei_id','tanggal_berangkat','tanggal_kembali','maksud_perjalanan','biaya_transport'];
        $cols = []; $params = [];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $body)) {
                $cols[]   = "$col = ?";
                $val = $body[$col];
                $params[] = ($val === '' || $val === null) ? null : $val;
            }
        }
        if (empty($cols)) respond(false, null, 'Tidak ada perubahan.', 422);

        $params[] = $id;
        $pdo->prepare('UPDATE laporan_perjalanan_dinas SET ' . implode(', ', $cols) . ' WHERE id = ?')
            ->execute($params);

        self::detail($id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SAVE RUNDOWN — Tahap 2: replace semua baris rundown
    // ─────────────────────────────────────────────────────────────────────────
    public static function saveRundown(int $id): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $row  = self::findOrFail($pdo, $id);
        self::authorizeOwnerOrAdmin($row);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $rows = $body['rundown'] ?? [];

        try {
            $pdo->beginTransaction();

            // Hapus lama, insert baru
            $pdo->prepare('DELETE FROM laporan_perjalanan_dinas_rundown WHERE laporan_id = ?')->execute([$id]);

            $stmt = $pdo->prepare("
                INSERT INTO laporan_perjalanan_dinas_rundown
                    (laporan_id, urutan, hari_tanggal, waktu_mulai, waktu_selesai, kegiatan, lokasi, deskripsi)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");

            foreach (array_values($rows) as $i => $r) {
                $stmt->execute([
                    $id,
                    $i,
                    !empty($r['hari_tanggal']) ? $r['hari_tanggal'] : null,
                    !empty($r['waktu_mulai'])  ? $r['waktu_mulai']  : null,
                    !empty($r['waktu_selesai'])? $r['waktu_selesai']: null,
                    trim($r['kegiatan'] ?? ''),
                    trim($r['lokasi']   ?? '') ?: null,
                    trim($r['deskripsi']?? '') ?: null,
                ]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            respond(false, null, 'Gagal menyimpan rundown: ' . $e->getMessage(), 500);
        }

        $stmtR = $pdo->prepare('SELECT * FROM laporan_perjalanan_dinas_rundown WHERE laporan_id = ? ORDER BY urutan ASC');
        $stmtR->execute([$id]);
        respond(true, $stmtR->fetchAll(), 'Rundown disimpan.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPLOAD FOTO — Tahap 3
    // ─────────────────────────────────────────────────────────────────────────
    public static function uploadFoto(int $id): void
    {
        requireAuth();
        $pdo = Database::connect();
        $row = self::findOrFail($pdo, $id);
        self::authorizeOwnerOrAdmin($row);

        if (empty($_FILES['foto'])) respond(false, null, 'Tidak ada file foto.', 422);

        // Cek jumlah foto yang sudah ada
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM laporan_perjalanan_dinas_dokumentasi WHERE laporan_id = ?');
        $countStmt->execute([$id]);
        $existing = (int)$countStmt->fetchColumn();
        if ($existing >= 10) respond(false, null, 'Maksimal 10 foto per laporan.', 422);

        $file     = $_FILES['foto'];
        $maxBytes = 5 * 1024 * 1024; // 5 MB
        $allowed  = ['image/jpeg', 'image/png', 'image/webp'];

        if ($file['size'] > $maxBytes) respond(false, null, 'Ukuran foto maksimal 5 MB.', 422);

        // Validasi MIME nyata
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($file['tmp_name']);
        if (!in_array($mime, $allowed, true)) {
            respond(false, null, 'Format foto harus JPG, PNG, atau WEBP.', 422);
        }

        $ext  = $mime === 'image/webp' ? 'webp' : ($mime === 'image/png' ? 'png' : 'jpg');
        $dir  = ROOT_DIR . "/uploads/perjalanan/$id/";
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $filename = uniqid('foto_', true) . ".$ext";
        $dest     = $dir . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            respond(false, null, 'Gagal menyimpan file.', 500);
        }

        // Dapatkan urutan berikutnya
        $stmtO = $pdo->prepare('SELECT COALESCE(MAX(urutan)+1, 0) FROM laporan_perjalanan_dinas_dokumentasi WHERE laporan_id = ?');
        $stmtO->execute([$id]);
        $urutan = (int)$stmtO->fetchColumn();

        $keterangan = trim($_POST['keterangan'] ?? '');
        $path       = "uploads/perjalanan/$id/$filename";

        $stmtI = $pdo->prepare("
            INSERT INTO laporan_perjalanan_dinas_dokumentasi (laporan_id, path, urutan, keterangan)
            VALUES (?, ?, ?, ?)
        ");
        $stmtI->execute([$id, $path, $urutan, $keterangan ?: null]);
        $fotoId = (int)$pdo->lastInsertId();

        $stmtF = $pdo->prepare('SELECT * FROM laporan_perjalanan_dinas_dokumentasi WHERE id = ?');
        $stmtF->execute([$fotoId]);
        respond(true, $stmtF->fetch(), 'Foto berhasil diunggah.', 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE FOTO
    // ─────────────────────────────────────────────────────────────────────────
    public static function deleteFoto(int $id, int $fotoId): void
    {
        requireAuth();
        $pdo = Database::connect();
        $laporan = self::findOrFail($pdo, $id);
        self::authorizeOwnerOrAdmin($laporan);

        $stmt = $pdo->prepare('SELECT * FROM laporan_perjalanan_dinas_dokumentasi WHERE id = ? AND laporan_id = ?');
        $stmt->execute([$fotoId, $id]);
        $row = $stmt->fetch();
        if (!$row) respond(false, null, 'Foto tidak ditemukan.', 404);

        // Hapus file fisik
        $path = ROOT_DIR . '/' . $row['path'];
        if (file_exists($path)) @unlink($path);

        $pdo->prepare('DELETE FROM laporan_perjalanan_dinas_dokumentasi WHERE id = ?')->execute([$fotoId]);
        respond(true, null, 'Foto dihapus.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SELESAI — finalisasi + generate 3 .docx + zip
    // ─────────────────────────────────────────────────────────────────────────
    public static function selesai(int $id): void
    {
        requireAuth();
        $pdo = Database::connect();
        $laporan = self::findOrFail($pdo, $id);
        self::authorizeOwnerOrAdmin($laporan);

        // Update ringkasan jika dikirim
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (isset($body['ringkasan_hasil'])) {
            $pdo->prepare('UPDATE laporan_perjalanan_dinas SET ringkasan_hasil = ? WHERE id = ?')
                ->execute([$body['ringkasan_hasil'], $id]);
            $laporan['ringkasan_hasil'] = $body['ringkasan_hasil'];
        }

        // Ambil data lengkap
        $stmtP = $pdo->prepare('SELECT * FROM petugas WHERE id = ?');
        $stmtP->execute([$laporan['petugas_id']]);
        $petugas = $stmtP->fetch() ?: [];

        $stmtW = $pdo->prepare('SELECT * FROM master_wilayah WHERE id = ?');
        $stmtW->execute([$laporan['tujuan_wilayah_id']]);
        $wilayah = $stmtW->fetch() ?: [];

        $survei = null;
        if ($laporan['survei_id']) {
            $stmtS = $pdo->prepare('SELECT * FROM master_survei WHERE id = ?');
            $stmtS->execute([$laporan['survei_id']]);
            $survei = $stmtS->fetch();
        }

        $stmtR = $pdo->prepare('SELECT * FROM laporan_perjalanan_dinas_rundown WHERE laporan_id = ? ORDER BY urutan ASC');
        $stmtR->execute([$id]);
        $rundown = $stmtR->fetchAll();

        $stmtF = $pdo->prepare('SELECT * FROM laporan_perjalanan_dinas_dokumentasi WHERE laporan_id = ? ORDER BY urutan ASC');
        $stmtF->execute([$id]);
        $fotos = $stmtF->fetchAll();

        // Siapkan variabel template
        $vars = self::buildVars($laporan, $petugas, $wilayah, $survei);

        // Load PHPWord autoload
        require_once ROOT_DIR . '/vendor/autoload.php';

        // Buat folder output
        $outDir = ROOT_DIR . "/uploads/perjalanan/{$id}/";
        if (!is_dir($outDir)) mkdir($outDir, 0755, true);

        $files = [];

        // ── Dokumen 1: Laporan Perjalanan Dinas ──────────────────────────────
        $files[] = self::genLaporan($vars, $rundown, $fotos, $outDir);

        // ── Dokumen 2: Pernyataan Tidak Kendaraan Dinas ───────────────────────
        $files[] = self::genPernyataan($vars, $outDir);

        // ── Dokumen 3: Transport Lokal Riil ──────────────────────────────────
        $files[] = self::genTransportLokal($vars, $outDir);

        // Zip ketiga file
        $zipPath = $outDir . "laporan_perjalanan_{$id}.zip";
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach ($files as $f) {
            $zip->addFile($f, basename($f));
        }
        $zip->close();

        // Update status
        $pdo->prepare("UPDATE laporan_perjalanan_dinas SET status_pengisian = 'selesai' WHERE id = ?")
            ->execute([$id]);

        $userId = $_SESSION['user']['id'] ?? null;
        logActivity($pdo, $userId, 'selesai_perjalanan', 'laporan_perjalanan_dinas', $id, "Generate dokumen perjalanan");

        // Stream zip ke client
        self::streamZip($zipPath, "Laporan_Perjalanan_{$id}.zip");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DOWNLOAD ULANG — hanya jika sudah selesai
    // ─────────────────────────────────────────────────────────────────────────
    public static function download(int $id): void
    {
        requireAuth();
        $pdo     = Database::connect();
        $laporan = self::findOrFail($pdo, $id);
        self::authorizeOwnerOrAdmin($laporan);

        if ($laporan['status_pengisian'] !== 'selesai') {
            respond(false, null, 'Laporan belum selesai di-generate.', 409);
        }

        $zipPath = ROOT_DIR . "/uploads/perjalanan/{$id}/laporan_perjalanan_{$id}.zip";
        if (!file_exists($zipPath)) {
            respond(false, null, 'File tidak ditemukan. Silakan generate ulang via wizard.', 404);
        }

        self::streamZip($zipPath, "Laporan_Perjalanan_{$id}.zip");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────────────────
    public static function delete(int $id): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $row  = self::findOrFail($pdo, $id);
        self::authorizeOwnerOrAdmin($row);

        // Hapus folder upload
        $dir = ROOT_DIR . "/uploads/perjalanan/$id/";
        if (is_dir($dir)) {
            $files = glob($dir . '*');
            foreach ($files as $f) { if (is_file($f)) @unlink($f); }
            @rmdir($dir);
        }

        $pdo->prepare('DELETE FROM laporan_perjalanan_dinas WHERE id = ?')->execute([$id]);

        $userId = $_SESSION['user']['id'] ?? null;
        logActivity($pdo, $userId, 'hapus_perjalanan', 'laporan_perjalanan_dinas', $id, "Hapus laporan perjalanan");

        respond(true, null, 'Laporan perjalanan dinas berhasil dihapus.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private static function formatTanggalIndo(?string $dateStr): string
    {
        if (!$dateStr) return '';
        $bulan = [
            1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        $ts = strtotime($dateStr);
        $d  = (int)date('d', $ts);
        $m  = (int)date('n', $ts);
        $y  = date('Y', $ts);
        return "$d " . ($bulan[$m] ?? '') . " $y";
    }

    private static function getNamaHariIndo(?string $dateStr): string
    {
        if (!$dateStr) return '-';
        $hari = [
            'Sunday' => 'Minggu', 'Monday' => 'Senin', 'Tuesday' => 'Selasa',
            'Wednesday' => 'Rabu', 'Thursday' => 'Kamis', 'Friday' => 'Jumat', 'Saturday' => 'Sabtu'
        ];
        $dayEn = date('l', strtotime($dateStr));
        return $hari[$dayEn] ?? $dayEn;
    }

    private static function buildVars(array $l, array $p, array $w, ?array $s): array
    {
        $tglSTugasRaw = $l['tanggal_surat_tugas'] ?? null;
        $tglTugasRaw  = $l['tanggal_tugas'] ?? $l['tanggal_berangkat'] ?? null;

        $tglSTugas  = self::formatTanggalIndo($tglSTugasRaw);
        $tglTugas   = self::formatTanggalIndo($tglTugasRaw);
        $hariTugas  = self::getNamaHariIndo($tglTugasRaw);

        // Key sesuai placeholder ${...} di template Word
        return [
            'Pegawai'       => $p['nama']                ?? '',
            'NIP'           => $p['nip_atau_kode_mitra'] ?? '',
            'Jabatan'       => $p['jabatan']              ?? '',
            'Pangkat'       => $p['pangkat_golongan']     ?? '',
            'NoSurat'       => $l['nomor_surat']          ?? '',
            'TglSTugas'     => $tglSTugas,
            'TglTugas'      => $tglTugas,
            'Hari'          => $hariTugas,
            'Kegiatan'      => $l['maksud_perjalanan']    ?? '',
            'Kecamatan'     => $w['kecamatan']            ?? '',
            'Deskripsi'     => $l['ringkasan_hasil']      ?? '',
            'Survei'        => $s['nama_survei']          ?? '',
            'Jumlah'        => 'Rp ' . number_format((float)($l['biaya_transport'] ?? 0), 0, ',', '.'),
            'Terbilang'     => ucfirst(self::terbilang((int)($l['biaya_transport'] ?? 0))) . ' Rupiah',
        ];
    }

    /** Dapatkan path template docx yang valid (utamakan backend/templates/, fallback ke archive/) */
    private static function getTemplatePath(string $filename): string
    {
        $local = ROOT_DIR . '/templates/' . $filename;
        if (file_exists($local)) return $local;
        $archive = ROOT_DIR . '/../archive/template/' . $filename;
        if (file_exists($archive)) return $archive;
        return $local;
    }

    /** Isi template .docx menggunakan TemplateProcessor — layout asli tidak berubah */
    private static function fillTemplate(string $tplPath, array $vars, string $outPath): void
    {
        $proc = new \PhpOffice\PhpWord\TemplateProcessor($tplPath);
        foreach ($vars as $key => $value) {
            $proc->setValue($key, htmlspecialchars((string)($value ?? ''), ENT_XML1, 'UTF-8'));
        }
        $proc->saveAs($outPath);
    }

    /** Buat Laporan Perjalanan Dinas.docx dari template asli */
    private static function genLaporan(array $vars, array $rundown, array $fotos, string $outDir): string
    {
        $tplPath = self::getTemplatePath('Template Laporan Perjalanan Dinas.docx');
        $outPath = $outDir . 'Laporan_Perjalanan_Dinas.docx';

        $proc = new \PhpOffice\PhpWord\TemplateProcessor($tplPath);

        // Isi semua placeholder teks biasa (Pegawai, NIP, Jabatan, TglSTugas, TglTugas, Hari, Kecamatan, dst)
        foreach ($vars as $key => $value) {
            $proc->setValue($key, htmlspecialchars((string)($value ?? ''), ENT_XML1, 'UTF-8'));
        }

        // ── Rundown: Isi placeholder ${rentang_waktu} untuk setiap baris kegiatan ──
        if (!empty($rundown)) {
            foreach ($rundown as $r) {
                $waktu = '';
                if (!empty($r['waktu_mulai'])) {
                    $waktu = substr($r['waktu_mulai'], 0, 5);
                    if (!empty($r['waktu_selesai'])) {
                        $waktu .= ' - ' . substr($r['waktu_selesai'], 0, 5);
                    }
                }
                $proc->setValue('rentang_waktu', htmlspecialchars($waktu ?: '-', ENT_XML1, 'UTF-8'), 1);
            }
        }
        // Bersihkan jika ada sisa placeholder rentang_waktu yang belum terisi
        $proc->setValue('rentang_waktu', '-');

        // ── Foto: ganti placeholder ${Foto} dengan keterangan foto (teks) ───
        if (!empty($fotos)) {
            $fotoText = implode('; ', array_map(fn($f) => $f['keterangan'] ?: basename($f['path']), $fotos));
            $proc->setValue('Foto', htmlspecialchars($fotoText, ENT_XML1, 'UTF-8'));
        } else {
            $proc->setValue('Foto', '-');
        }

        $proc->saveAs($outPath);
        return $outPath;
    }

    /** Buat Pernyataan Tidak Menggunakan Kendaraan Dinas.docx dari template asli */
    private static function genPernyataan(array $vars, string $outDir): string
    {
        $tplPath = self::getTemplatePath('Template Pernyataan Tidak Menggunakan Kendaraan Dinas.docx');
        $outPath = $outDir . 'Pernyataan_Tidak_Kendaraan_Dinas.docx';

        self::fillTemplate($tplPath, $vars, $outPath);
        return $outPath;
    }

    /** Buat Transport Lokal Riil.docx dari template asli */
    private static function genTransportLokal(array $vars, string $outDir): string
    {
        $tplPath = self::getTemplatePath('Template Transport Lokal Riil.docx');
        $outPath = $outDir . 'Transport_Lokal_Riil.docx';

        self::fillTemplate($tplPath, $vars, $outPath);
        return $outPath;
    }


    /** Stream zip file ke browser */
    private static function streamZip(string $path, string $filename): void
    {
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: no-cache, must-revalidate');
        ob_clean();
        flush();
        readfile($path);
        exit;
    }

    /** Konversi angka ke terbilang Bahasa Indonesia */
    private static function terbilang(int $n): string
    {
        if ($n < 0) return 'minus ' . self::terbilang(-$n);
        $satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
                   'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas',
                   'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
        if ($n < 20)      return $satuan[$n];
        if ($n < 100)     return $satuan[(int)($n/10)] . ' puluh' . ($n % 10 ? ' ' . $satuan[$n % 10] : '');
        if ($n < 200)     return 'seratus' . ($n - 100 ? ' ' . self::terbilang($n - 100) : '');
        if ($n < 1000)    return $satuan[(int)($n/100)] . ' ratus' . ($n % 100 ? ' ' . self::terbilang($n % 100) : '');
        if ($n < 2000)    return 'seribu' . ($n - 1000 ? ' ' . self::terbilang($n - 1000) : '');
        if ($n < 1000000) return self::terbilang((int)($n/1000)) . ' ribu' . ($n % 1000 ? ' ' . self::terbilang($n % 1000) : '');
        if ($n < 1000000000) return self::terbilang((int)($n/1000000)) . ' juta' . ($n % 1000000 ? ' ' . self::terbilang($n % 1000000) : '');
        return self::terbilang((int)($n/1000000000)) . ' miliar' . ($n % 1000000000 ? ' ' . self::terbilang($n % 1000000000) : '');
    }
}
