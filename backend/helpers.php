<?php
/**
 * helpers.php — Global utility functions untuk SIMADU backend.
 *
 * Sudah di-require oleh index.php sebelum controller apapun.
 */
declare(strict_types=1);

// ─── Response helper ──────────────────────────────────────────────────────────
function respond(bool $success, mixed $data = null, string $message = '', int $code = 200): never
{
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data'    => $data,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ─── Request body parser ──────────────────────────────────────────────────────
function requestBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw !== '' && $raw !== false) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return !empty($_POST) ? $_POST : [];
}

// ─── Query string helper ──────────────────────────────────────────────────────
function query(string $key, mixed $default = null): mixed
{
    return isset($_GET[$key]) && $_GET[$key] !== '' ? $_GET[$key] : $default;
}

// ─── Input sanitizer ─────────────────────────────────────────────────────────
function clean(mixed $value): string
{
    return trim(htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8'));
}

// ─── Required fields validator ────────────────────────────────────────────────
/**
 * @param array<string, string> $fields  ['fieldKey' => 'Nama Field']
 */
function validateRequired(array $body, array $fields): void
{
    foreach ($fields as $key => $label) {
        if (!isset($body[$key]) || trim((string) $body[$key]) === '') {
            respond(false, null, "{$label} wajib diisi.", 422);
        }
    }
}

// ─── Activity log ────────────────────────────────────────────────────────────
/**
 * logActivity — tulis ke log_aktivitas.
 *
 * @param PDO|null $pdo     — koneksi aktif (re-use untuk efisiensi)
 * @param int|null $userId  — dari $_SESSION['user']['id']
 * @param string   $aksi    — 'upload_dokumen', 'hapus_tugas', dst.
 * @param string   $objek   — nama tabel/entitas, contoh: 'dokumen'
 * @param int|null $objekId — PK baris yang dipengaruhi (nullable)
 * @param string   $detail  — keterangan bebas
 */
function logActivity(
    ?PDO $pdo,
    ?int $userId,
    string $aksi,
    string $objek,
    ?int $objekId = null,
    string $detail = ''
): void {
    try {
        $db = $pdo ?? Database::connect();
        $db->prepare(
            'INSERT INTO log_aktivitas (user_id, aksi, objek, detail, waktu)
             VALUES (?, ?, ?, ?, NOW())'
        )->execute([
            $userId,
            $aksi,
            $objekId !== null ? $objek . ':' . $objekId : $objek,
            // kolom detail bertipe JSON — wajib encode
            $detail !== '' ? json_encode($detail, JSON_UNESCAPED_UNICODE) : null,
        ]);
    } catch (Throwable) {
        // Log gagal tidak boleh meledak — abaikan saja
    }
}


// ─── Periode display helper ───────────────────────────────────────────────────
/**
 * Buat string tampilan periode ringkas dari baris tugas.
 * Contoh: "2025 / Bln 3", "2025 / TW 2", "2025 / Mggu 1 Bln 4"
 */
function formatPeriode(array $row): string
{
    $tahun = $row['tahun'];
    switch ($row['jenis_periode'] ?? '') {
        case 'mingguan':
            return "{$tahun} / Mggu {$row['minggu_ke']} Bln {$row['bulan']}";
        case 'bulanan':
            return "{$tahun} / Bln {$row['bulan']}";
        case 'triwulanan':
            return "{$tahun} / TW {$row['triwulan_ke']}";
        default:
            return (string) $tahun;
    }
}

// ─── Status calculator ────────────────────────────────────────────────────────
function calcStatus(int $target, int $selesai): string
{
    if ($target === 0) return 'Belum Mulai';
    $pct = $selesai / $target;
    if ($pct <= 0) return 'Belum Mulai';
    if ($pct >= 1) return 'Selesai';
    return 'Berjalan';
}

function calcPersen(int $target, int $selesai): int
{
    if ($target === 0) return 0;
    return (int) min(100, round(($selesai / $target) * 100));
}
