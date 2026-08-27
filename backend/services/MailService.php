<?php
declare(strict_types=1);
/**
 * MailService — Layanan Pengiriman Email SMTP & Template Digest
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class MailService
{
    /**
     * Dapatkan konfigurasi mail
     */
    public static function getConfig(): array
    {
        $configFile = defined('ROOT_DIR') ? ROOT_DIR . '/config/mail.php' : dirname(__DIR__) . '/config/mail.php';
        if (file_exists($configFile)) {
            return require $configFile;
        }
        return [
            'driver'     => 'smtp',
            'host'       => 'smtp.hostinger.com',
            'port'       => 465,
            'encryption' => 'ssl',
            'username'   => 'simadu@bps-batanghari.com',
            'password'   => 'Bps1504@',
            'from_email' => 'simadu@bps-batanghari.com',
            'from_name'  => 'SIMADU — BPS Kab. Batang Hari',
            'reply_to'   => 'simadu@bps-batanghari.com',
        ];
    }

    /**
     * Kirim email generik via SMTP PHPMailer
     */
    public static function send(string $toEmail, string $toName, string $subject, string $htmlBody, string $altBody = ''): array
    {
        $vendorAutoload = defined('ROOT_DIR') ? ROOT_DIR . '/vendor/autoload.php' : dirname(__DIR__) . '/vendor/autoload.php';
        require_once $vendorAutoload;

        $cfg = self::getConfig();

        if (empty($cfg['username']) || empty($cfg['password'])) {
            return ['success' => false, 'message' => 'Konfigurasi SMTP belum lengkap.'];
        }

        $mail = new PHPMailer(true);

        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host       = $cfg['host'] ?? 'smtp.hostinger.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = $cfg['username'];
            $mail->Password   = $cfg['password'];
            $mail->SMTPSecure = ($cfg['encryption'] === 'ssl') ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = (int)($cfg['port'] ?? 465);
            $mail->CharSet    = 'UTF-8';
            $mail->Timeout    = 20;

            // Recipients
            $mail->setFrom($cfg['from_email'] ?? 'simadu@bps-batanghari.com', $cfg['from_name'] ?? 'SIMADU — BPS Kab. Batang Hari');
            $mail->addAddress($toEmail, $toName);
            if (!empty($cfg['reply_to'])) {
                $mail->addReplyTo($cfg['reply_to'], $cfg['from_name']);
            }

            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlBody;
            $mail->AltBody = $altBody ?: strip_tags(str_replace(['<br>', '</td>', '</tr>'], ["\n", " | ", "\n"], $htmlBody));

            $mail->send();
            return ['success' => true, 'message' => 'Email berhasil dikirim ke ' . $toEmail];
        } catch (Exception $e) {
            $err = $mail->ErrorInfo ?: $e->getMessage();
            error_log("MailService Error to {$toEmail}: " . $err);
            return ['success' => false, 'message' => 'Gagal mengirim email: ' . $err];
        }
    }

    /**
     * Kirim email uji coba ke pengguna
     */
    public static function sendTestEmail(string $toEmail, string $toName): array
    {
        $subject = '🔔 Uji Coba Layanan Email SIMADU BPS Kab. Batang Hari';
        $waktu = date('d F Y, H:i:s') . ' WIB';

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Uji Coba Email SIMADU</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -2px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #1e293b 0%, #3e5c7e 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">SIMADU</h1>
              <p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">Sistem Monitoring Kegiatan Distribusi Terpadu</p>
              <p style="margin:2px 0 0;color:#94a3b8;font-size:11px;">BPS Kabupaten Batang Hari</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:50%;background-color:#ecfdf5;color:#059669;font-size:28px;margin-bottom:12px;">
                  ✓
                </div>
                <h2 style="margin:0;color:#0f172a;font-size:18px;font-weight:700;">Konfigurasi Email Berhasil!</h2>
                <p style="margin:8px 0 0;color:#64748b;font-size:14px;line-height:1.5;">
                  Halo <strong>{$toName}</strong>, layanan email notifikasi SIMADU telah berhasil terhubung dengan server mail BPS Kabupaten Batang Hari.
                </p>
              </div>

              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:24px;font-size:13px;">
                <table width="100%" cellpadding="4" cellspacing="0">
                  <tr>
                    <td style="color:#64748b;width:130px;">Alamat Penerima:</td>
                    <td style="color:#0f172a;font-weight:600;">{$toEmail}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;">Pengirim:</td>
                    <td style="color:#0f172a;font-weight:600;">simadu@bps-batanghari.com</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;">Waktu Pengujian:</td>
                    <td style="color:#0f172a;">{$waktu}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;">Status Koneksi:</td>
                    <td style="color:#059669;font-weight:600;">SMTP SSL Port 465 (Aktif)</td>
                  </tr>
                </table>
              </div>

              <p style="margin:0 0 24px;color:#475569;font-size:13px;line-height:1.6;">
                Anda akan menerima rekap email otomatis setiap pagi apabila terdapat tugas kegiatan statistik yang mendekati batas waktu penyerahan dokumen/kuesioner (H-5, H-3, H-1, dan Hari H).
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;">
                <a href="https://bps-batanghari.com/simadu/dashboard" style="display:inline-block;background-color:#3e5c7e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;box-shadow:0 2px 4px rgba(62,92,126,0.25);">
                  Buka Dashboard SIMADU &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;line-height:1.5;">
              <p style="margin:0;">Email ini dikirim secara otomatis oleh Sistem SIMADU.</p>
              <p style="margin:4px 0 0;">Badan Pusat Statistik Kabupaten Batang Hari &bull; Jl. Jenderal Sudirman No. 12, Muara Bulian, Jambi</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;

        return self::send($toEmail, $toName, $subject, $htmlBody);
    }

    /**
     * Kirim email rekap harian (Daily Digest) tugas mendekati deadline
     */
    public static function sendDeadlineDigest(array $user, array $tasks): array
    {
        $toEmail = $user['email'] ?? '';
        $toName  = $user['nama'] ?? $user['username'] ?? 'Admin';

        if (!$toEmail || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => "Alamat email untuk user {$toName} tidak valid."];
        }

        $totalTasks = count($tasks);
        $subject    = "⚠️ [SIMADU] Rekap Deadline: {$totalTasks} Tugas Statistik Mendekati Batas Waktu";
        $tglHariIni = date('d F Y');

        // Render baris tabel tugas
        $rowsHtml = '';
        foreach ($tasks as $idx => $t) {
            $sisaHari = (int)$t['sisa_hari'];
            
            // Badge threshold
            $badgeBg = '#dbeafe';
            $badgeColor = '#1e40af';
            $badgeText = "H-$sisaHari";

            if ($sisaHari === 0) {
                $badgeBg = '#fee2e2';
                $badgeColor = '#991b1b';
                $badgeText = 'HARI INI';
            } elseif ($sisaHari === 1) {
                $badgeBg = '#ffedd5';
                $badgeColor = '#c2410c';
                $badgeText = 'H-1 (Besok)';
            } elseif ($sisaHari === 3) {
                $badgeBg = '#fef3c7';
                $badgeColor = '#b45309';
                $badgeText = 'H-3';
            } elseif ($sisaHari === 5) {
                $badgeBg = '#e0e7ff';
                $badgeColor = '#3730a3';
                $badgeText = 'H-5';
            }

            $tglDeadline = date('d/m/Y', strtotime($t['deadline']));
            $wilayah = htmlspecialchars($t['kecamatan'] . ($t['desa_kelurahan'] ? ' - ' . $t['desa_kelurahan'] : ''));
            $namaSurvei = htmlspecialchars($t['nama_survei']);
            $namaPetugas = htmlspecialchars($t['nama_petugas'] ?: '-');
            $realisasi = "{$t['sampel_selesai']} / {$t['target_sampel']} sampel";
            $persen = (float)($t['persen'] ?? 0);

            $bgColor = ($idx % 2 === 0) ? '#ffffff' : '#f8fafc';

            $rowsHtml .= <<<HTML
            <tr style="background-color:{$bgColor};border-bottom:1px solid #e2e8f0;">
              <td style="padding:12px 10px;font-size:13px;color:#0f172a;font-weight:600;">
                {$namaSurvei}
                <div style="font-size:11px;color:#64748b;font-weight:normal;margin-top:2px;">Petugas: {$namaPetugas}</div>
              </td>
              <td style="padding:12px 10px;font-size:12px;color:#334155;">
                {$wilayah}
              </td>
              <td style="padding:12px 10px;font-size:12px;color:#334155;text-align:center;">
                <div style="font-weight:600;">{$realisasi}</div>
                <div style="font-size:11px;color:#64748b;">({$persen}%)</div>
              </td>
              <td style="padding:12px 10px;text-align:center;">
                <span style="display:inline-block;background-color:{$badgeBg};color:{$badgeColor};padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:0.3px;">
                  {$badgeText}
                </span>
                <div style="font-size:11px;color:#64748b;margin-top:3px;">{$tglDeadline}</div>
              </td>
            </tr>
HTML;
        }

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rekap Deadline SIMADU</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="680" style="max-width:680px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -2px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #1e293b 0%, #3e5c7e 100%);padding:26px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">SIMADU</h1>
              <p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">Pengingat Batas Waktu Tugas Kegiatan Statistik</p>
              <p style="margin:2px 0 0;color:#94a3b8;font-size:11px;">BPS Kabupaten Batang Hari &bull; {$tglHariIni}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 12px;font-size:15px;color:#0f172a;">
                Yth. Bapak/Ibu <strong>{$toName}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:13px;color:#475569;line-height:1.6;">
                Berikut adalah rekapitulasi <strong>{$totalTasks} tugas kegiatan statistik</strong> yang berada pada periode mendekati batas waktu (H-5, H-3, H-1, atau Hari H) dan memerlukan perhatian/penyelesaian di lapangan:
              </p>

              <!-- Table -->
              <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;text-align:left;">
                  <thead>
                    <tr style="background-color:#f8fafc;border-bottom:2px solid #e2e8f0;">
                      <th style="padding:10px;font-size:12px;font-weight:700;color:#475569;">Kegiatan / Petugas</th>
                      <th style="padding:10px;font-size:12px;font-weight:700;color:#475569;">Wilayah</th>
                      <th style="padding:10px;font-size:12px;font-weight:700;color:#475569;text-align:center;">Realisasi</th>
                      <th style="padding:10px;font-size:12px;font-weight:700;color:#475569;text-align:center;">Batas Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {$rowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Action Card -->
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;">
                <p style="margin:0 0 14px;font-size:13px;color:#475569;">
                  Silakan koordinasikan dengan petugas lapangan terkait untuk percepatan penyelesaian dokumen dan entri data.
                </p>
                <a href="https://bps-batanghari.com/simadu/kelola-tugas" style="display:inline-block;background-color:#3e5c7e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;box-shadow:0 2px 4px rgba(62,92,126,0.25);">
                  Buka Kelola Tugas SIMADU &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;text-align:center;font-size:11px;color:#94a3b8;line-height:1.5;">
              <p style="margin:0;">Email ini dikirim secara otomatis oleh SIMADU &bull; Sistem Monitoring Kegiatan Distribusi Terpadu.</p>
              <p style="margin:3px 0 0;">BPS Kabupaten Batang Hari &bull; Jl. Jenderal Sudirman No. 12, Muara Bulian, Jambi</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;

        return self::send($toEmail, $toName, $subject, $htmlBody);
    }
}
