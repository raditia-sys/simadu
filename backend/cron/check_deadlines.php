<?php
/**
 * CLI Cron Script — SIMADU Deadline Checker & Push Notifier
 *
 * Jalankan via Windows Task Scheduler atau Cron:
 * php.exe d:\Simadu\backend\cron\check_deadlines.php
 */
declare(strict_types=1);

define('ROOT_DIR', dirname(__DIR__));

require_once ROOT_DIR . '/config/database.php';
require_once ROOT_DIR . '/vendor/autoload.php';

echo "[" . date('Y-m-d H:i:s') . "] Memulai pengecekan deadline tugas SIMADU...\n";

$pdo = Database::connect();

// 1. Cari tugas belum selesai yang mendekati deadline (H-3, H-1, H-0)
$sql = "
    SELECT
        t.id, t.target_sampel, t.sampel_selesai, t.deadline,
        DATEDIFF(t.deadline, CURDATE()) AS sisa_hari,
        s.nama_survei, s.kode_survei,
        w.kecamatan, w.desa_kelurahan,
        p.nama AS nama_petugas
    FROM tugas_kegiatan t
    JOIN master_survei s ON s.id = t.survei_id
    JOIN master_wilayah w ON w.id = t.wilayah_id
    LEFT JOIN petugas p ON p.id = t.petugas_id
    WHERE t.deadline IS NOT NULL
      AND t.sampel_selesai < t.target_sampel
      AND DATEDIFF(t.deadline, CURDATE()) IN (0, 1, 3)
    ORDER BY t.deadline ASC
";
$stmt = $pdo->query($sql);
$tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($tasks)) {
    echo "[" . date('Y-m-d H:i:s') . "] Tidak ada tugas yang mendekati deadline (H-3, H-1, Hari H) saat ini.\n";
    exit(0);
}

echo "[" . date('Y-m-d H:i:s') . "] Ditemukan " . count($tasks) . " tugas yang mendekati deadline.\n";

// 2. Ambil subscriptions Web Push yang terdaftar
$stmtSubs = $pdo->query("
    SELECT ups.*, u.id AS user_id, u.nama AS user_nama, u.email
    FROM user_push_subscriptions ups
    JOIN users u ON u.id = ups.user_id
");
$allSubs = $stmtSubs->fetchAll(PDO::FETCH_ASSOC);

if (empty($allSubs)) {
    echo "[" . date('Y-m-d H:i:s') . "] Belum ada perangkat admin yang terdaftar pada Web Push.\n";
    exit(0);
}

$vapidConfig = file_exists(ROOT_DIR . '/config/vapid.php') ? require ROOT_DIR . '/config/vapid.php' : null;
if (!$vapidConfig || empty($vapidConfig['publicKey'])) {
    echo "[" . date('Y-m-d H:i:s') . "] Konfigurasi VAPID belum tersedia.\n";
    exit(1);
}

$auth = [
    'VAPID' => [
        'subject'    => $vapidConfig['subject'] ?? 'mailto:admin.simadu@bps.go.id',
        'publicKey'  => $vapidConfig['publicKey'],
        'privateKey' => $vapidConfig['privateKey'],
    ],
];

$webPush = new \Minishlink\WebPush\WebPush($auth);
$webPush->setReuseVAPIDHeaders(true);

$notifiedCount = 0;

foreach ($tasks as $task) {
    $sisaHari = (int)$task['sisa_hari'];
    $threshold = match ($sisaHari) {
        3 => 'H-3',
        1 => 'H-1',
        0 => 'H-0',
        default => "H-$sisaHari",
    };

    $labelStatus = match ($sisaHari) {
        3 => '3 hari lagi',
        1 => 'besok (H-1)',
        0 => 'HARI INI',
        default => "$sisaHari hari lagi",
    };

    $tglDeadline = date('d/m/Y', strtotime($task['deadline']));

    // Filter target subscriptions yang belum pernah menerima log notifikasi ini
    $targetSubs = [];
    foreach ($allSubs as $sub) {
        $stmtLog = $pdo->prepare("
            SELECT id FROM notification_logs
            WHERE tugas_id = ? AND user_id = ? AND threshold = ? AND tipe = 'webpush'
        ");
        $stmtLog->execute([(int)$task['id'], (int)$sub['user_id'], $threshold]);
        if (!$stmtLog->fetch()) {
            $targetSubs[] = $sub;
        }
    }

    if (empty($targetSubs)) {
        continue;
    }

    $wilayah = $task['kecamatan'] . ($task['desa_kelurahan'] ? ' - ' . $task['desa_kelurahan'] : '');
    $title = "⚠️ Deadline {$threshold}: {$task['nama_survei']}";
    $body = "Batas akhir {$task['nama_survei']} di {$wilayah} adalah {$labelStatus} ({$tglDeadline}). Progres: {$task['sampel_selesai']}/{$task['target_sampel']} sampel.";

    $payload = json_encode([
        'title' => $title,
        'body'  => $body,
        'icon'  => '/logo_bps.png',
        'badge' => '/favicon.ico',
        'data'  => [
            'url'      => '/kelola-tugas',
            'tugas_id' => $task['id']
        ]
    ]);

    foreach ($targetSubs as $sub) {
        $subscription = \Minishlink\WebPush\Subscription::create([
            'endpoint'        => $sub['endpoint'],
            'publicKey'       => $sub['p256dh_key'],
            'authToken'       => $sub['auth_token'],
            'contentEncoding' => 'aesgcm',
        ]);
        $webPush->queueNotification($subscription, $payload);
    }

    $distinctUsers = array_unique(array_column($targetSubs, 'user_id'));
    $stmtInsertLog = $pdo->prepare("
        INSERT INTO notification_logs (tugas_id, user_id, tipe, threshold, sent_at)
        VALUES (?, ?, 'webpush', ?, NOW())
    ");
    foreach ($distinctUsers as $uid) {
        $stmtInsertLog->execute([(int)$task['id'], (int)$uid, $threshold]);
    }

    $notifiedCount++;
}

// Flush notifications
$sentSuccess = 0;
foreach ($webPush->flush() as $report) {
    if ($report->isSuccess()) {
        $sentSuccess++;
    } else {
        $endpoint = $report->getRequest()->getUri()->__toString();
        if ($report->isSubscriptionExpired()) {
            $stmtDel = $pdo->prepare('DELETE FROM user_push_subscriptions WHERE endpoint = ?');
            $stmtDel->execute([$endpoint]);
        }
    }
}

echo "[" . date('Y-m-d H:i:s') . "] Pengecekan selesai. Berhasil mengirim $sentSuccess push notification untuk $notifiedCount tugas.\n";
