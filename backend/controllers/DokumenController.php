<?php
/**
 * DokumenController — Manajemen Dokumen.
 *
 * RBAC:
 * - Upload:          semua (superadmin + admin)
 * - Download:        semua
 * - Edit metadata:   superadmin only
 * - Hapus:           superadmin only
 *
 * File tersimpan di /backend/uploads/dokumen/{yyyy}/{mm}/
 * Endpoint:
 * GET    /api/dokumen                 → index
 * POST   /api/dokumen/upload          → upload file baru
 * PUT    /api/dokumen/{id}            → edit metadata (superadmin)
 * DELETE /api/dokumen/{id}            → hapus file+record (superadmin)
 * GET    /api/dokumen/download/{id}   → stream file ke browser
 */
class DokumenController
{
    /** Direktori upload, relatif terhadap ROOT_DIR/backend */
    private static function uploadDir(string $year, string $month): string
    {
        $dir = ROOT_DIR . '/uploads/dokumen/' . $year . '/' . $month . '/';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    private static function requireSuperadmin(): void
    {
        requireRole('superadmin');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INDEX
    // ─────────────────────────────────────────────────────────────────────────
    public static function index(): void
    {
        requireAuth();
        $pdo = Database::connect();

        $where  = [];
        $params = [];

        if ($q = query('q')) {
            $where[]  = 'd.nama_file LIKE ?';
            $params[] = '%' . $q . '%';
        }
        if ($kat = query('kategori')) {
            $where[]  = 'd.kategori = ?';
            $params[] = $kat;
        }
        if ($survei_id = query('survei_id')) {
            $where[]  = 'd.survei_id = ?';
            $params[] = (int)$survei_id;
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $pdo->prepare("
            SELECT
                d.id, d.nama_file, d.kategori, d.deskripsi, d.uploaded_at,
                d.ukuran_byte, d.mime_type, d.survei_id,
                ms.nama_survei,
                u.nama AS uploaded_by_nama
            FROM dokumen d
            LEFT JOIN users      u  ON u.id  = d.uploaded_by
            LEFT JOIN master_survei ms ON ms.id = d.survei_id
            $whereSql
            ORDER BY d.uploaded_at DESC
        ");
        $stmt->execute($params);
        respond(true, $stmt->fetchAll());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPLOAD
    // ─────────────────────────────────────────────────────────────────────────
    public static function upload(): void
    {
        requireAuth();

        // Validasi ada file
        if (empty($_FILES['file'])) {
            respond(false, null, 'Tidak ada file yang dikirim.', 400);
        }
        $file  = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            respond(false, null, 'Upload gagal (kode: ' . $file['error'] . ').', 400);
        }

        // Limit 25 MB
        $maxBytes = 25 * 1024 * 1024;
        if ($file['size'] > $maxBytes) {
            respond(false, null, 'Ukuran file melebihi batas 25 MB.', 413);
        }

        // Tipe yang diizinkan
        $allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'text/plain', 'text/csv',
            'application/zip', 'application/x-zip-compressed',
        ];

        // Deteksi MIME real (bukan dari client)
        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $mimeReal = $finfo->file($file['tmp_name']);
        if (!in_array($mimeReal, $allowedMimes, true)) {
            respond(false, null, 'Tipe file tidak diizinkan: ' . $mimeReal, 415);
        }

        // Whitelist ekstensi file ketat
        $allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'csv', 'zip'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExtensions, true)) {
            respond(false, null, 'Ekstensi file tidak diizinkan.', 415);
        }

        $year  = date('Y');
        $month = date('m');
        $dir   = self::uploadDir($year, $month);

        // Nama unik — hindari path traversal
        $safeName = uniqid('dok_', true) . '.' . $ext;
        $destPath = $dir . $safeName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            respond(false, null, 'Gagal menyimpan file ke server.', 500);
        }

        // Ambil metadata dari request body (POST fields)
        $kategori   = $_POST['kategori']   ?? 'Umum';
        $deskripsi  = $_POST['deskripsi']  ?? '';
        $survei_id  = !empty($_POST['survei_id']) ? (int)$_POST['survei_id'] : null;
        $namaFile   = trim($_POST['nama_file'] ?? '') ?: pathinfo($file['name'], PATHINFO_FILENAME);

        $userId = $_SESSION['user']['id'] ?? null;

        $pdo = Database::connect();
        $stmt = $pdo->prepare("
            INSERT INTO dokumen (nama_file, path, kategori, deskripsi, survei_id, mime_type, ukuran_byte, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $namaFile,
            'uploads/dokumen/' . $year . '/' . $month . '/' . $safeName,
            $kategori,
            $deskripsi,
            $survei_id,
            $mimeReal,
            (int)$file['size'],
            $userId,
        ]);
        $id = (int)$pdo->lastInsertId();

        // Log
        logActivity($pdo, $userId, 'upload_dokumen', 'dokumen', $id, 'Upload dokumen: ' . $namaFile);

        $stmt2 = $pdo->prepare('SELECT * FROM dokumen WHERE id = ?');
        $stmt2->execute([$id]);
        respond(true, $stmt2->fetch(), 'Dokumen berhasil diunggah.', 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STORE LINK — simpan tautan eksternal/link entri
    // ─────────────────────────────────────────────────────────────────────────
    public static function storeLink(): void
    {
        requireAuth();
        $body = requestBody();
        validateRequired($body, [
            'nama_file' => 'Nama Tautan',
            'url'       => 'URL Tautan',
        ]);

        $namaFile  = clean($body['nama_file']);
        $url       = clean($body['url']);
        $kategori  = clean($body['kategori'] ?? 'Tautan Entri');
        $deskripsi = clean($body['deskripsi'] ?? '');
        $surveiId  = !empty($body['survei_id']) ? (int)$body['survei_id'] : null;
        $userId    = $_SESSION['user']['id'] ?? null;

        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            respond(false, null, 'URL Tautan tidak valid. Masukkan URL lengkap (misal: https://...)', 422);
        }

        $pdo = Database::connect();
        $stmt = $pdo->prepare("
            INSERT INTO dokumen (nama_file, path, kategori, deskripsi, survei_id, mime_type, ukuran_byte, uploaded_by, uploaded_at)
            VALUES (?, ?, ?, ?, ?, 'text/url', 0, ?, NOW())
        ");
        $stmt->execute([
            $namaFile,
            $url,
            $kategori ?: 'Tautan Entri',
            $deskripsi,
            $surveiId,
            $userId,
        ]);
        $id = (int)$pdo->lastInsertId();

        // Jika survei_id diisi dan tautan_entri_data di master_survei masih kosong, perbarui otomatis
        if ($surveiId) {
            $pdo->prepare("UPDATE master_survei SET tautan_entri_data = ? WHERE id = ? AND (tautan_entri_data IS NULL OR tautan_entri_data = '')")
                ->execute([$url, $surveiId]);
        }

        logActivity($pdo, $userId, 'tambah_link_dokumen', 'dokumen', $id, 'Tambah link dokumen: ' . $namaFile);

        $stmt2 = $pdo->prepare('SELECT * FROM dokumen WHERE id = ?');
        $stmt2->execute([$id]);
        respond(true, $stmt2->fetch(), 'Tautan entri berhasil ditambahkan.', 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DOWNLOAD — stream file langsung / redirect link
    // ─────────────────────────────────────────────────────────────────────────
    public static function download(int $id): void
    {
        requireAuth();
        $pdo = Database::connect();

        $stmt = $pdo->prepare('SELECT * FROM dokumen WHERE id = ?');
        $stmt->execute([$id]);
        $doc = $stmt->fetch();

        if (!$doc) respond(false, null, 'Dokumen tidak ditemukan.', 404);

        if ($doc['mime_type'] === 'text/url' || str_starts_with($doc['path'], 'http://') || str_starts_with($doc['path'], 'https://')) {
            header('Location: ' . $doc['path']);
            exit;
        }

        $filePath = ROOT_DIR . '/' . $doc['path'];
        if (!file_exists($filePath)) {
            respond(false, null, 'File fisik tidak ditemukan di server.', 404);
        }

        $ext      = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $safeName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $doc['nama_file']) . '.' . $ext;

        while (ob_get_level()) ob_end_clean();
        header('Content-Type: ' . ($doc['mime_type'] ?: 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . $safeName . '"');
        header('Content-Length: ' . filesize($filePath));
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-cache, must-revalidate');
        readfile($filePath);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE METADATA — superadmin only
    // ─────────────────────────────────────────────────────────────────────────
    public static function update(int $id): void
    {
        self::requireSuperadmin();
        $pdo  = Database::connect();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $stmt = $pdo->prepare('SELECT id FROM dokumen WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) respond(false, null, 'Dokumen tidak ditemukan.', 404);

        $cols   = [];
        $params = [];

        foreach (['nama_file','kategori','deskripsi','survei_id'] as $col) {
            if (array_key_exists($col, $body)) {
                $cols[]   = "$col = ?";
                $params[] = $col === 'survei_id' && $body[$col] === '' ? null : $body[$col];
            }
        }

        if (empty($cols)) respond(false, null, 'Tidak ada field yang diubah.', 422);

        $params[] = $id;
        $pdo->prepare('UPDATE dokumen SET ' . implode(', ', $cols) . ' WHERE id = ?')
            ->execute($params);

        $userId = $_SESSION['user']['id'] ?? null;
        logActivity($pdo, $userId, 'edit_dokumen', 'dokumen', $id, 'Edit metadata dokumen id:' . $id);

        $stmt2 = $pdo->prepare('SELECT * FROM dokumen WHERE id = ?');
        $stmt2->execute([$id]);
        respond(true, $stmt2->fetch(), 'Metadata berhasil diperbarui.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE — superadmin only
    // ─────────────────────────────────────────────────────────────────────────
    public static function delete(int $id): void
    {
        self::requireSuperadmin();
        $pdo = Database::connect();

        $stmt = $pdo->prepare('SELECT * FROM dokumen WHERE id = ?');
        $stmt->execute([$id]);
        $doc = $stmt->fetch();
        if (!$doc) respond(false, null, 'Dokumen tidak ditemukan.', 404);

        // Hapus file fisik
        $filePath = ROOT_DIR . '/' . $doc['path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        $pdo->prepare('DELETE FROM dokumen WHERE id = ?')->execute([$id]);

        $userId = $_SESSION['user']['id'] ?? null;
        logActivity($pdo, $userId, 'hapus_dokumen', 'dokumen', $id, 'Hapus dokumen: ' . $doc['nama_file']);

        respond(true, null, 'Dokumen berhasil dihapus.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // KATEGORI LIST — untuk dropdown filter
    // ─────────────────────────────────────────────────────────────────────────
    public static function kategoriList(): void
    {
        requireAuth();
        $pdo  = Database::connect();
        $stmt = $pdo->query("SELECT DISTINCT kategori FROM dokumen WHERE kategori IS NOT NULL ORDER BY kategori");
        $list = $stmt->fetchAll(PDO::FETCH_COLUMN);
        // Tambahkan kategori default yang umum
        $defaults = ['Umum', 'Metodologi', 'Kuesioner', 'Laporan', 'Pelatihan', 'SK/Surat', 'Materi'];
        $merged = array_values(array_unique(array_merge($defaults, $list)));
        sort($merged);
        respond(true, $merged);
    }
}
