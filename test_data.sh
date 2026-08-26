echo '=== TEST MYSQL QUERY EXECUTION SPEED & ERROR ==='
mysql -u u927936405_simadu -p'Alief12321.' u927936405_simadu -e "
SELECT COUNT(*) AS total_tugas FROM tugas_kegiatan;
SELECT COUNT(*) AS total_laporan FROM laporan_perjalanan_dinas;
SELECT COUNT(*) AS total_wilayah FROM master_wilayah;
"