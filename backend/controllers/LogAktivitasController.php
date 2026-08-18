<?php
/**
 * LogAktivitasController — kronologis log aktivitas (superadmin only).
 *
 * GET /api/log
 */
class LogAktivitasController
{
    public static function index(): void
    {
        requireRole('superadmin');
        $pdo = Database::connect();

        $where  = [];
        $params = [];

        if ($user_id = query('user_id')) {
            $where[]  = 'la.user_id = ?';
            $params[] = (int)$user_id;
        }
        if ($aksi = query('aksi')) {
            $where[]  = 'la.aksi LIKE ?';
            $params[] = '%' . $aksi . '%';
        }
        if ($dari = query('dari')) {
            $where[]  = 'la.waktu >= ?';
            $params[] = $dari . ' 00:00:00';
        }
        if ($sampai = query('sampai')) {
            $where[]  = 'la.waktu <= ?';
            $params[] = $sampai . ' 23:59:59';
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $limit    = min(500, (int)(query('limit') ?? 200));

        $stmt = $pdo->prepare("
            SELECT
                la.id, la.aksi, la.objek, la.detail, la.waktu,
                u.nama AS nama_user, u.role AS role_user
            FROM log_aktivitas la
            LEFT JOIN users u ON u.id = la.user_id
            $whereSql
            ORDER BY la.waktu DESC
            LIMIT $limit
        ");
        $stmt->execute($params);
        respond(true, $stmt->fetchAll());
    }
}
