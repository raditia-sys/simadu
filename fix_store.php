<?php
$file = 'D:\Simadu\backend\controllers\LaporanPerjalananController.php';
$content = file_get_contents($file);

$content = preg_replace(
    '/(trim\(\$body\[\'maksud_perjalanan\'\]\),\s*\$biaya,\s*\$userId,)(\s*\]\);)/',
    '$1' . "\n            !empty(\$body['grup_id']) ? (int)\$body['grup_id'] : null," . '$2',
    $content
);

file_put_contents($file, $content);
echo "Done.\n";
