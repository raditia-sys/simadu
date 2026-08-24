<?php
define("ROOT_DIR", "/home/u927936405/domains/bps-batanghari.com/public_html/simadu/backend");
require ROOT_DIR . "/helpers.php";
require ROOT_DIR . "/config/database.php";
$pdo = Database::connect();
$cnt = $pdo->query("SELECT COUNT(*) FROM tugas_kegiatan")->fetchColumn();
echo "TOTAL TUGAS IN DB: " . $cnt . "\n";
$rows = $pdo->query("SELECT t.id, ms.nama_survei, t.tahun, t.triwulan_ke, t.bulan, t.deadline, p.nama AS nama_petugas FROM tugas_kegiatan t JOIN master_survei ms ON ms.id = t.survei_id JOIN petugas p ON p.id = t.petugas_id ORDER BY t.id DESC LIMIT 4")->fetchAll();
foreach ($rows as $r) {
    echo "- ID: {$r['id']} | {$r['nama_survei']} | TW: {$r['triwulan_ke']} | Petugas: {$r['nama_petugas']} | Deadline: {$r['deadline']}\n";
}
