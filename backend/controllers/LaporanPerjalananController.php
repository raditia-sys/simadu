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
            $where[]  = 'lp.tanggal_berangkat >= ?';
            $params[] = $dari;
        }
        if ($sampai = query('sampai')) {
            $where[]  = 'lp.tanggal_kembali <= ?';
            $params[] = $sampai;
        }
        if ($status = query('status')) {
            $where[]  = 'lp.status_pengisian = ?';
            $params[] = $status;
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $pdo->prepare("
            SELECT
                lp.id, lp.nomor_surat, lp.tanggal_surat_tugas, lp.tanggal_berangkat, lp.tanggal_kembali,
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

        $required = [
            'petugas_id'        => 'Petugas',
            'tujuan_wilayah_id' => 'Wilayah Tujuan',
            'tanggal_berangkat' => 'Tanggal Berangkat',
            'tanggal_kembali'   => 'Tanggal Kembali',
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
                (petugas_id, nomor_surat, tanggal_surat_tugas, tujuan_wilayah_id, survei_id,
                 tanggal_berangkat, tanggal_kembali, maksud_perjalanan, biaya_transport,
                 status_pengisian, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NOW())
        ");
        $stmt->execute([
            (int)$body['petugas_id'],
            trim($body['nomor_surat'] ?? ''),
            $body['tanggal_surat_tugas'] ?? null,
            (int)$body['tujuan_wilayah_id'],
            !empty($body['survei_id']) ? (int)$body['survei_id'] : null,
            $body['tanggal_berangkat'],
            $body['tanggal_kembali'],
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
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        // Jika wilayah berubah, recalculate biaya kecuali override manual
        if (!empty($body['tujuan_wilayah_id']) && !isset($body['biaya_transport'])) {
            $stmtW = $pdo->prepare('SELECT rate_transport_lokal FROM master_wilayah WHERE id = ?');
            $stmtW->execute([$body['tujuan_wilayah_id']]);
            $w = $stmtW->fetch();
            if ($w) $body['biaya_transport'] = $w['rate_transport_lokal'];
        }

        $allowed = ['petugas_id','nomor_surat','tanggal_surat_tugas','tujuan_wilayah_id',
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
        self::findOrFail($pdo, $id);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $rows = $body['rundown'] ?? [];

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
        self::findOrFail($pdo, $id);

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
        $petugas = $stmtP->fetch();

        $stmtW = $pdo->prepare('SELECT * FROM master_wilayah WHERE id = ?');
        $stmtW->execute([$laporan['tujuan_wilayah_id']]);
        $wilayah = $stmtW->fetch();

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

    private static function buildVars(array $l, array $p, array $w, ?array $s): array
    {
        $tglSTugas  = $l['tanggal_surat_tugas'] ? date('d F Y', strtotime($l['tanggal_surat_tugas'])) : '';
        $tglMulai   = $l['tanggal_berangkat']   ? date('d F Y', strtotime($l['tanggal_berangkat']))   : '';
        $tglSelesai = $l['tanggal_kembali']      ? date('d F Y', strtotime($l['tanggal_kembali']))     : '';
        $tglTugas   = $tglMulai === $tglSelesai ? $tglMulai : "$tglMulai s.d. $tglSelesai";

        return [
            '[Pegawai]'   => $p['nama']                 ?? '',
            '[NIP]'       => $p['nip_atau_kode_mitra']  ?? '',
            '[Jabatan]'   => $p['jabatan']               ?? '',
            '[Pangkat]'   => $p['pangkat_golongan']      ?? '',
            '[NoSurat]'   => $l['nomor_surat']           ?? '',
            '[TglSTugas]' => $tglSTugas,
            '[TglTugas]'  => $tglTugas,
            '[Kegiatan]'  => $l['maksud_perjalanan']     ?? '',
            '[Kecamatan]' => $w['kecamatan']             ?? '',
            '[Deskripsi]' => $l['ringkasan_hasil']       ?? '',
            '[Survei]'    => $s['nama_survei']           ?? '',
            '[Jumlah]'    => number_format((float)($l['biaya_transport'] ?? 0), 0, ',', '.'),
            '[Terbilang]' => self::terbilang((int)($l['biaya_transport'] ?? 0)),
        ];
    }

    private static function fillTemplate(string $tpl, array $vars): string
    {
        return str_replace(array_keys($vars), array_values($vars), $tpl);
    }

    /** Buat Laporan Perjalanan Dinas.docx */
    private static function genLaporan(array $vars, array $rundown, array $fotos, string $outDir): string
    {
        $phpWord = new \PhpOffice\PhpWord\PhpWord();
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(12);

        $section = $phpWord->addSection([
            'marginTop'    => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(2.54),
            'marginBottom' => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(2.54),
            'marginLeft'   => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(3),
            'marginRight'  => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(2.54),
        ]);

        // ── Kop surat ────────────────────────────────────────────────────────
        $headerStyle = ['bold' => true, 'size' => 12, 'name' => 'Times New Roman'];
        $section->addText('BADAN PUSAT STATISTIK KABUPATEN BATANG HARI', $headerStyle, ['align' => 'center']);
        $section->addText('Jl. Jend. Sudirman Muara Bulian 36613 Telp (0743) 21008', ['size' => 10, 'name' => 'Times New Roman'], ['align' => 'center']);
        $section->addText('Homepage: https://batangharikab.bps.go.id | Email: bps1504@bps.go.id', ['size' => 10, 'name' => 'Times New Roman'], ['align' => 'center']);
        $section->addLine(['weight' => 2, 'color' => '000000', 'width' => \PhpOffice\PhpWord\Shared\Converter::cmToEmu(16)]);
        $section->addTextBreak(1);

        // ── Tanggal & tujuan ─────────────────────────────────────────────────
        $section->addText('Muara Bulian, ' . date('d F Y'), null, ['align' => 'right']);
        $section->addText('Yth. Kepala BPS Kabupaten Batang Hari', null, ['align' => 'left']);
        $section->addText('Di - Tempat', null, ['align' => 'left']);
        $section->addTextBreak(1);
        $section->addText('Dengan ini disampaikan Laporan Perjalanan Dinas sebagai berikut:', null);
        $section->addTextBreak(1);

        // ── Identitas Pegawai ─────────────────────────────────────────────────
        $section->addText('Identitas Pegawai', $headerStyle);
        $idents = [
            'Nama'       => $vars['[Pegawai]'],
            'NIP'        => $vars['[NIP]'],
            'Jabatan'    => $vars['[Jabatan]'],
            'Unit Kerja' => 'BPS Kabupaten Batang Hari',
        ];
        foreach ($idents as $k => $v) {
            $r = $section->addTextRun();
            $r->addText("$k", ['bold' => true]);
            $r->addText(" : $v");
        }
        $section->addTextBreak(1);

        // ── Kegiatan ──────────────────────────────────────────────────────────
        $section->addText('Kegiatan', $headerStyle);
        $keg = [
            'No. Surat Tugas'   => $vars['[NoSurat]'],
            'Tanggal Surat Tugas' => $vars['[TglSTugas]'],
            'Tanggal Tugas'     => $vars['[TglTugas]'],
            'Tujuan Tugas'      => $vars['[Kegiatan]'],
        ];
        foreach ($keg as $k => $v) {
            $r = $section->addTextRun();
            $r->addText("$k", ['bold' => true]);
            $r->addText(" : $v");
        }
        $section->addTextBreak(1);

        // ── Jadwal Rundown ────────────────────────────────────────────────────
        $section->addText('LAPORAN PERJALANAN DINAS', $headerStyle, ['align' => 'center']);
        $section->addText('JADWAL, WAKTU DAN LOKASI PELAKSANAAN KEGIATAN', ['bold' => true], ['align' => 'center']);
        $section->addTextBreak(1);

        $tblStyle = ['borderSize' => 6, 'borderColor' => '000000', 'cellMargin' => 80];
        $tbl = $section->addTable($tblStyle);

        // Header tabel
        $tbl->addRow();
        foreach (['No.', 'Hari/Tanggal', 'Waktu (WIB)', 'Kegiatan', 'Lokasi'] as $h) {
            $cell = $tbl->addCell(null, ['bgColor' => 'D9D9D9']);
            $cell->addText($h, ['bold' => true], ['align' => 'center']);
        }

        foreach ($rundown as $i => $r) {
            $tbl->addRow();
            $hariTgl = '';
            if ($r['hari_tanggal']) {
                $hariTgl = date('l, d F Y', strtotime($r['hari_tanggal']));
            }
            $waktu = '';
            if ($r['waktu_mulai']) {
                $waktu = substr($r['waktu_mulai'], 0, 5);
                if ($r['waktu_selesai']) $waktu .= ' - ' . substr($r['waktu_selesai'], 0, 5);
            }
            $tbl->addCell(600)->addText((string)($i+1), null, ['align' => 'center']);
            $tbl->addCell(2200)->addText($hariTgl);
            $tbl->addCell(1800)->addText($waktu, null, ['align' => 'center']);
            $tbl->addCell(4000)->addText($r['kegiatan'] . ($r['deskripsi'] ? "\n{$r['deskripsi']}" : ''));
            $tbl->addCell(2400)->addText($r['lokasi'] ?? '');
        }

        $section->addTextBreak(1);

        // ── Resume & Kesimpulan ───────────────────────────────────────────────
        $section->addText('RESUME DAN KESIMPULAN HASIL PERJALANAN DINAS', $headerStyle, ['align' => 'center']);
        $section->addText($vars['[Deskripsi]'] ?: 'Tidak ada keterangan.', null);
        $section->addText('Kegiatan ' . $vars['[Kegiatan]'] . ' berjalan dengan lancar tanpa adanya kendala.', null);
        $section->addText('Perjalanan dinas ini ditutup dengan kembalinya saya ke Muara Bulian, Kabupaten Batang Hari.', null);
        $section->addText('Demikian laporan perjalanan dinas ini saya sampaikan. Terimakasih.', null);
        $section->addTextBreak(2);

        // TTD
        $r = $section->addTextRun(['align' => 'right']);
        $r->addText('Yang Melakukan Perjalanan Dinas,');
        $section->addTextBreak(4);
        $section->addText($vars['[Pegawai]'], ['bold' => true], ['align' => 'right']);
        $section->addText('NIP. ' . $vars['[NIP]'], null, ['align' => 'right']);

        // ── Lampiran Foto ─────────────────────────────────────────────────────
        if (!empty($fotos)) {
            $phpWord->addSection()->addPageBreak();
            $sec2 = $phpWord->addSection();
            $sec2->addText('DOKUMENTASI KEGIATAN', $headerStyle, ['align' => 'center']);
            $sec2->addTextBreak(1);

            foreach (array_chunk($fotos, 2) as $pair) {
                $tblF = $sec2->addTable(['borderSize' => 0, 'cellMargin' => 100]);
                $tblF->addRow();
                foreach ($pair as $foto) {
                    $fPath = ROOT_DIR . '/' . $foto['path'];
                    $cell  = $tblF->addCell(4500);
                    if (file_exists($fPath)) {
                        try {
                            $cell->addImage($fPath, ['width' => 200, 'height' => 150, 'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
                        } catch (\Throwable) {}
                    }
                    if ($foto['keterangan']) {
                        $cell->addText($foto['keterangan'], ['italic' => true, 'size' => 10], ['align' => 'center']);
                    }
                }
                // Pad baris jika hanya 1 foto
                if (count($pair) === 1) {
                    $tblF->addCell(4500)->addText('');
                }
            }
        }

        $out = $outDir . 'Laporan_Perjalanan_Dinas.docx';
        $writer = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($out);
        return $out;
    }

    /** Buat Pernyataan Tidak Menggunakan Kendaraan Dinas.docx */
    private static function genPernyataan(array $vars, string $outDir): string
    {
        $phpWord = new \PhpOffice\PhpWord\PhpWord();
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(12);

        $section = $phpWord->addSection([
            'marginTop'    => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(3),
            'marginBottom' => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(2.54),
            'marginLeft'   => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(3),
            'marginRight'  => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(2.54),
        ]);

        $section->addText('PERNYATAAN TIDAK MENGGUNAKAN KENDARAAN DINAS', ['bold' => true, 'size' => 14], ['align' => 'center']);
        $section->addTextBreak(2);
        $section->addText('Yang bertanda tangan dibawah ini:');
        $section->addTextBreak(1);

        $data = [
            'Nama'             => $vars['[Pegawai]'],
            'NIP'              => $vars['[NIP]'],
            'Pangkat/Golongan' => $vars['[Pangkat]'],
            'Jabatan'          => $vars['[Jabatan]'],
            'Unit Kerja'       => 'BPS Batang Hari',
        ];
        foreach ($data as $k => $v) {
            $r = $section->addTextRun();
            $r->addText(str_pad($k, 20), ['bold' => true]);
            $r->addText(': ' . $v);
        }
        $section->addTextBreak(1);

        $body = 'Menerangkan bahwa dalam rangka melaksanakan perjalanan dinas dalam kota untuk melaksanakan tugas kedinasan sesuai surat tugas nomor: ' . $vars['[NoSurat]'] . ' pelaksanaan tanggal ' . $vars['[TglTugas]'] . ', saya benar-benar tidak menggunakan kendaraan dinas.';
        $section->addText($body, null, ['align' => 'both']);
        $section->addTextBreak(1);
        $section->addText('Demikian pernyataan ini kami buat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya. Apabila terdapat kekeliruan dalam pertanggungjawaban SPD dan mengakibatkan kerugian negara, saya bersedia dituntut sesuai aturan yang berlaku dan mengembalikan biaya transport lokal yang sudah saya terima ke kas negara.', null, ['align' => 'both']);
        $section->addTextBreak(2);

        $tbl = $section->addTable(['borderSize' => 0, 'cellMargin' => 50]);
        $tbl->addRow();
        $tbl->addCell(5000)->addText('');
        $c2 = $tbl->addCell(5000);
        $c2->addText('Batang Hari, ' . date('d F Y'), null, ['align' => 'center']);
        $c2->addText('Pelaksana Perjalanan Dinas', null, ['align' => 'center']);
        $c2->addTextBreak(4);
        $c2->addText($vars['[Pegawai]'], ['bold' => true, 'underline' => 'single'], ['align' => 'center']);

        $out = $outDir . 'Pernyataan_Tidak_Kendaraan_Dinas.docx';
        $writer = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($out);
        return $out;
    }

    /** Buat Transport Lokal Riil.docx */
    private static function genTransportLokal(array $vars, string $outDir): string
    {
        $phpWord = new \PhpOffice\PhpWord\PhpWord();
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(12);

        $section = $phpWord->addSection([
            'marginTop'    => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(2.54),
            'marginBottom' => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(2.54),
            'marginLeft'   => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(3),
            'marginRight'  => \PhpOffice\PhpWord\Shared\Converter::cmToTwip(2.54),
        ]);

        $section->addText('DAFTAR PENGELUARAN RIIL', ['bold' => true, 'size' => 14], ['align' => 'center']);
        $section->addTextBreak(2);
        $section->addText('Yang bertanda tangan dibawah ini :');
        $section->addTextBreak(1);

        $idents = [
            'Nama'        => $vars['[Pegawai]'],
            'NIP/ID Sobat'=> $vars['[NIP]'],
            'Jabatan'     => $vars['[Jabatan]'],
        ];
        foreach ($idents as $k => $v) {
            $r = $section->addTextRun();
            $r->addText(str_pad($k, 15), ['bold' => true]);
            $r->addText(': ' . $v);
        }
        $section->addTextBreak(1);

        $r = $section->addTextRun();
        $r->addText('Berdasarkan Surat Tugas Nomor : ');
        $r->addText($vars['[NoSurat]'], ['bold' => true]);
        $r->addText(' tanggal ' . $vars['[TglSTugas]'] . ', dengan ini kami menyatakan dengan sesungguhnya bahwa Biaya transport pegawai/mitra dan/atau biaya penginapan dibawah ini yang tidak dapat diperoleh bukti-bukti pengeluarannya, meliputi :');
        $section->addTextBreak(1);

        // Tabel pengeluaran
        $tblStyle = ['borderSize' => 6, 'borderColor' => '000000', 'cellMargin' => 80, 'width' => 9000];
        $tbl = $section->addTable($tblStyle);
        $tbl->addRow();
        foreach (['No.', 'Uraian', 'Jumlah'] as $h) {
            $tbl->addCell(null, ['bgColor' => 'D9D9D9'])->addText($h, ['bold' => true], ['align' => 'center']);
        }
        $tbl->addRow();
        $tbl->addCell(600)->addText('1.', null, ['align' => 'center']);
        $tbl->addCell(6800)->addText('Transport Lokal ' . $vars['[Kegiatan]'] . ' ' . $vars['[Survei]']);
        $tbl->addCell(2000)->addText('Rp ' . $vars['[Jumlah]'], null, ['align' => 'right']);

        // Jumlah total
        $tbl->addRow();
        $c = $tbl->addCell(7400, ['gridSpan' => 2, 'borderTopSize' => 6, 'borderTopColor' => '000000']);
        $c->addText('Jumlah', ['bold' => true], ['align' => 'right']);
        $tbl->addCell(2000)->addText('Rp ' . $vars['[Jumlah]'], ['bold' => true], ['align' => 'right']);

        $section->addTextBreak(1);
        $section->addText('Terbilang : ' . $vars['[Terbilang]'], ['italic' => true]);
        $section->addTextBreak(1);

        $section->addText('Jumlah uang tersebut pada angka 1 diatas benar-benar dikeluarkan untuk pelaksanaan perjalanan dinas dimaksud dan apabila dikemudian hari terdapat kelebihan atas pembayaran, kami bersedia untuk menyetorkan kelebihan tersebut ke kas negara.', null, ['align' => 'both']);
        $section->addTextBreak(1);
        $section->addText('Demikian pernyataan ini kami buat dengan sebenarnya, untuk dipergunakan sebagaimana mestinya.', null, ['align' => 'both']);
        $section->addTextBreak(2);

        // TTD dua kolom
        $tblTTD = $section->addTable(['borderSize' => 0, 'cellMargin' => 50]);
        $tblTTD->addRow();
        $c1 = $tblTTD->addCell(5000);
        $c1->addText('Mengetahui/Menyetujui', null, ['align' => 'center']);
        $c1->addText('Pejabat Pembuat Komitmen,', null, ['align' => 'center']);
        $c1->addTextBreak(4);
        $c1->addText('Madik, S.E., M.E', ['bold' => true, 'underline' => 'single'], ['align' => 'center']);
        $c1->addText('NIP. 19840505 200502 1 001', null, ['align' => 'center']);

        $c2 = $tblTTD->addCell(5000);
        $c2->addText('Pejabat Negara/Pegawai Negeri', null, ['align' => 'center']);
        $c2->addText('yang melakukan perjalanan dinas', null, ['align' => 'center']);
        $c2->addTextBreak(4);
        $c2->addText($vars['[Pegawai]'], ['bold' => true, 'underline' => 'single'], ['align' => 'center']);
        $c2->addText('NIP./ID Sobat ' . $vars['[NIP]'], null, ['align' => 'center']);

        $out = $outDir . 'Transport_Lokal_Riil.docx';
        $writer = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($out);
        return $out;
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
