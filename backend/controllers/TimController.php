<?php
/**
 * TimController — Tim & Organisasi.
 * Menampilkan daftar pegawai + mitra dari tabel petugas dengan kontak.
 *
 * GET /api/tim
 */
class TimController
{
    public static function index(): void
    {
        requireAuth();
        $pdo = Database::connect();

        $where  = [];
        $params = [];
        if ($q = query('q')) {
            $where[]  = '(p.nama LIKE ? OR p.nip_atau_kode_mitra LIKE ? OR p.kontak LIKE ?)';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
            $params[] = '%' . $q . '%';
        }
        if ($tipe = query('tipe')) {
            $where[]  = 'p.tipe = ?';
            $params[] = $tipe;
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $pdo->prepare("
            SELECT
                p.id, p.nama, p.tipe, p.nip_atau_kode_mitra, p.kontak,
                COUNT(DISTINCT t.id) AS total_tugas,
                SUM(CASE WHEN t.sampel_selesai >= t.target_sampel AND t.target_sampel > 0 THEN 1 ELSE 0 END) AS tugas_selesai,
                ROUND(
                    AVG(CASE WHEN t.target_sampel > 0 THEN LEAST(100, t.sampel_selesai / t.target_sampel * 100) ELSE 0 END), 1
                ) AS rata_persen
            FROM petugas p
            LEFT JOIN tugas_kegiatan t ON t.petugas_id = p.id
            $whereSql
            GROUP BY p.id, p.nama, p.tipe, p.nip_atau_kode_mitra, p.kontak
            ORDER BY p.tipe, p.nama
        ");
        $stmt->execute($params);

        $data = $stmt->fetchAll();

        // Pisahkan pegawai & mitra untuk tampilan terkelompok
        $pegawai = array_values(array_filter($data, fn($r) => $r['tipe'] === 'pegawai'));
        $mitra   = array_values(array_filter($data, fn($r) => $r['tipe'] === 'mitra'));

        respond(true, [
            'pegawai' => $pegawai,
            'mitra'   => $mitra,
        ]);
    }
}
