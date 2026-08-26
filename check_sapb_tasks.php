<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=u927936405_simadu;charset=utf8mb4", "u927936405_simadu", "Alief12321.", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $stmt = $pdo->query("SELECT id, survei_id, tahun, triwulan_ke, deadline FROM tugas_kegiatan WHERE survei_id = 1 LIMIT 10");
    $rows = $stmt->fetchAll();
    echo "SAPB_TASKS: " . json_encode($rows) . "\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
