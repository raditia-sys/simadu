<?php
$ftp_server = '46.202.138.202';
$ftp_user = 'u927936405';
$ftp_pass = 'Qwerty12321zxcxz.';

$conn_id = ftp_connect($ftp_server, 21);
if (!$conn_id) { echo 'FTP connection failed'; exit(1); }
$login = ftp_login($conn_id, $ftp_user, $ftp_pass);
if (!$login) { echo 'FTP login failed'; exit(1); }
ftp_pasv($conn_id, true);

if (ftp_put($conn_id, 'public_html/simadu/backend/index.php', 'backend/index.php', FTP_BINARY)) echo "Uploaded index.php\n";
if (ftp_put($conn_id, 'public_html/simadu/backend/controllers/LaporanPerjalananController.php', 'backend/controllers/LaporanPerjalananController.php', FTP_BINARY)) echo "Uploaded controller\n";
if (ftp_put($conn_id, 'frontend_dist.zip', 'frontend_dist.zip', FTP_BINARY)) echo "Uploaded zip\n";

ftp_close($conn_id);
?>
