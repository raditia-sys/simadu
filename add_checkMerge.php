<?php
// Let's add checkMerge() directly into the file.
// We'll read the file, locate public static function store(), and insert checkMerge before it.
$file = 'D:\Simadu\backend\controllers\LaporanPerjalananController.php';
$content = file_get_contents($file);

$checkMergeCode = "
    public static function checkMerge(): void
    {
        requireAuth();
        $pdo = Database::connect();
        
        $petugas_id = (int)query('petugas_id');
        $tujuan_wilayah_id = (int)query('tujuan_wilayah_id');
        $survei_id = (int)query('survei_id');
        $tanggal_tugas = query('tanggal_tugas');
        
        if (!$petugas_id || !$tujuan_wilayah_id || !$survei_id || !$tanggal_tugas) {
            respond(false, null, 'Parameter tidak lengkap', 400);
        }
        
        $bulan = date('m', strtotime($tanggal_tugas));
        $tahun = date('Y', strtotime($tanggal_tugas));
        
        $stmt = $pdo->prepare('
            SELECT id, grup_id, tanggal_tugas
            FROM laporan_perjalanan_dinas
            WHERE petugas_id = ? 
              AND tujuan_wilayah_id = ?
              AND survei_id = ?
              AND MONTH(tanggal_tugas) = ?
              AND YEAR(tanggal_tugas) = ?
            ORDER BY tanggal_tugas ASC
        ');
        $stmt->execute([$petugas_id, $tujuan_wilayah_id, $survei_id, $bulan, $tahun]);
        $laporans = $stmt->fetchAll();
        
        // Filter out identical date just in case? Or no, maybe the user wants to group multiple reports for the same date?
        // Actually, the prompt says 'Gabungkan dengan laporan tanggal [X]'.
        
        respond(true, $laporans, 'Berhasil ambil data merge');
    }
";

if (strpos($content, 'public static function checkMerge()') === false) {
    $content = str_replace('public static function store(): void', $checkMergeCode . "\n    public static function store(): void", $content);
    file_put_contents($file, $content);
    echo "checkMerge added.\n";
} else {
    echo "checkMerge already exists.\n";
}
