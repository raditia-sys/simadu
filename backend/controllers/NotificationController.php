<?php
/**
 * NotificationController — Web Push Notification & Deadline Checker
 */
class NotificationController
{
    /** Dapatkan Public VAPID Key untuk pendaftaran di frontend */
    public static function getVapidPublicKey(): void
    {
        requireAuth();
        $vapidConfig = file_exists(ROOT_DIR . '/config/vapid.php') ? require ROOT_DIR . '/config/vapid.php' : null;

        if (!$vapidConfig || empty($vapidConfig['publicKey'])) {
            respond(false, null, 'VAPID keys belum dikonfigurasi pada server.', 500);
        }

        respond(true, ['publicKey' => $vapidConfig['publicKey']]);
    }

    /** Simpan / Update Push Subscription dari browser pengguna */
    public static function subscribe(): void
    {
        $user = requireAuth();
        $body = requestBody();

        validateRequired($body, [
            'endpoint' => 'Endpoint',
            'keys'     => 'Keys',
        ]);

        $endpoint  = trim($body['endpoint']);
        $p256dhKey = trim($body['keys']['p256dh'] ?? '');
        $authToken = trim($body['keys']['auth'] ?? '');
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

        if (!$endpoint || !$p256dhKey || !$authToken) {
            respond(false, null, 'Subscription keys tidak lengkap.', 422);
        }

        $pdo = Database::connect();

        // Cek apakah endpoint sudah ada
        $stmt = $pdo->prepare('SELECT id FROM user_push_subscriptions WHERE endpoint = ?');
        $stmt->execute([$endpoint]);
        $existing = $stmt->fetch();

        if ($existing) {
            $stmtUpdate = $pdo->prepare("
                UPDATE user_push_subscriptions
                SET user_id = ?, p256dh_key = ?, auth_token = ?, user_agent = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmtUpdate->execute([(int)$user['id'], $p256dhKey, $authToken, $userAgent, (int)$existing['id']]);
        } else {
            $stmtInsert = $pdo->prepare("
                INSERT INTO user_push_subscriptions (user_id, endpoint, p256dh_key, auth_token, user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $stmtInsert->execute([(int)$user['id'], $endpoint, $p256dhKey, $authToken, $userAgent]);
        }

        respond(true, null, 'Notifikasi browser berhasil diaktifkan.');
    }

    /** Hapus Push Subscription */
    public static function unsubscribe(): void
    {
        $user = requireAuth();
        $body = requestBody();
        $endpoint = trim($body['endpoint'] ?? '');

        if ($endpoint) {
            $pdo = Database::connect();
            $stmt = $pdo->prepare('DELETE FROM user_push_subscriptions WHERE user_id = ? AND endpoint = ?');
            $stmt->execute([(int)$user['id'], $endpoint]);
        }

        respond(true, null, 'Langganan notifikasi berhasil dihapus.');
    }

    /** Uji coba kirim Web Push ke pengguna yang sedang login */
    public static function testPush(): void
    {
        $user = requireAuth();
        $pdo = Database::connect();

        $stmt = $pdo->prepare('SELECT * FROM user_push_subscriptions WHERE user_id = ?');
        $stmt->execute([(int)$user['id']]);
        $subs = $stmt->fetchAll();

        if (empty($subs)) {
            respond(false, null, 'Belum ada perangkat/browser yang terdaftar untuk akun ini. Silakan izinkan notifikasi terlebih dahulu.', 404);
        }

        $payload = json_encode([
            'title' => 'SIMADU — Uji Coba Notifikasi',
            'body'  => 'Halo ' . htmlspecialchars($user['nama']) . '! Notifikasi Web Push SIMADU berhasil terhubung ke browser perangkat Anda.',
            'icon'  => '/logo_bps.png',
            'badge' => '/favicon.ico',
            'data'  => ['url' => '/kelola-tugas']
        ]);

        $sentCount = self::sendPushToSubscriptions($subs, $payload);

        if ($sentCount > 0) {
            respond(true, ['sent_devices' => $sentCount], "Notifikasi uji coba berhasil dikirim ke $sentCount perangkat aktif.");
        } else {
            respond(false, null, 'Gagal mengirim notifikasi. Pastikan browser mendukung push notification.', 500);
        }
    }

    /** Cek deadline dan kirim notifikasi otomatis */
    public static function checkDeadlines(): void
    {
        requireAuth();
        $pdo = Database::connect();

        // Cari tugas belum selesai yang mendekati deadline (H-3, H-1, H-0)
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
        $tasks = $stmt->fetchAll();

        if (empty($tasks)) {
            respond(true, ['notified_tasks' => 0, 'tasks' => []], 'Tidak ada tugas yang mendekati deadline (H-3, H-1, Hari H) saat ini.');
        }

        // Ambil semua subscriptions admin
        $stmtSubs = $pdo->query("
            SELECT ups.*, u.id AS user_id, u.nama AS user_nama, u.role
            FROM user_push_subscriptions ups
            JOIN users u ON u.id = ups.user_id
        ");
        $allSubs = $stmtSubs->fetchAll();

        if (empty($allSubs)) {
            respond(true, ['notified_tasks' => count($tasks), 'sent_devices' => 0], 'Daftar tugas terdeteksi, namun belum ada browser admin yang mengaktifkan notifikasi.');
        }

        $sentTasksCount = 0;
        $totalPushes = 0;

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

            // Format tanggal deadline Indo
            $tglDeadline = date('d/m/Y', strtotime($task['deadline']));

            // Filter user yang belum pernah dikirim notifikasi untuk tugas & threshold ini
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
                continue; // Sudah pernah dikirim
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

            $sent = self::sendPushToSubscriptions($targetSubs, $payload);
            if ($sent > 0) {
                $sentTasksCount++;
                $totalPushes += $sent;

                // Catat log pengiriman per user
                $distinctUsers = array_unique(array_column($targetSubs, 'user_id'));
                $stmtInsertLog = $pdo->prepare("
                    INSERT INTO notification_logs (tugas_id, user_id, tipe, threshold, sent_at)
                    VALUES (?, ?, 'webpush', ?, NOW())
                ");
                foreach ($distinctUsers as $uid) {
                    $stmtInsertLog->execute([(int)$task['id'], (int)$uid, $threshold]);
                }
            }
        }

        respond(true, [
            'tasks_found'     => count($tasks),
            'tasks_notified'  => $sentTasksCount,
            'total_pushes'    => $totalPushes,
        ], "Pengecekan selesai. Berhasil mengirim $totalPushes notifikasi untuk $sentTasksCount tugas.");
    }

    /** Helper internal kirim push menggunakan Minishlink\WebPush */
    private static function sendPushToSubscriptions(array $subscriptions, string $payload): int
    {
        if (empty($subscriptions)) return 0;

        require_once ROOT_DIR . '/vendor/autoload.php';
        $vapidConfig = require ROOT_DIR . '/config/vapid.php';

        $auth = [
            'VAPID' => [
                'subject'    => $vapidConfig['subject'] ?? 'mailto:admin.simadu@bps.go.id',
                'publicKey'  => $vapidConfig['publicKey'],
                'privateKey' => $vapidConfig['privateKey'],
            ],
        ];

        try {
            $webPush = new \Minishlink\WebPush\WebPush($auth);
            $webPush->setReuseVAPIDHeaders(true);

            foreach ($subscriptions as $sub) {
                $subscription = \Minishlink\WebPush\Subscription::create([
                    'endpoint'        => $sub['endpoint'],
                    'publicKey'       => $sub['p256dh_key'],
                    'authToken'       => $sub['auth_token'],
                    'contentEncoding' => 'aesgcm',
                ]);

                $webPush->queueNotification($subscription, $payload);
            }

            $sentCount = 0;
            $pdo = Database::connect();

            foreach ($webPush->flush() as $report) {
                $endpoint = $report->getRequest()->getUri()->__toString();
                if ($report->isSuccess()) {
                    $sentCount++;
                } else {
                    // Jika subscription sudah expired / invalid di browser, hapus dari database
                    if ($report->isSubscriptionExpired()) {
                        $stmtDel = $pdo->prepare('DELETE FROM user_push_subscriptions WHERE endpoint = ?');
                        $stmtDel->execute([$endpoint]);
                    }
                }
            }

            return $sentCount;
        } catch (\Throwable $e) {
            error_log('WebPush Send Error: ' . $e->getMessage());
            return 0;
        }
    }
}
