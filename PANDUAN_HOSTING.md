# 🚀 Panduan Deployment & Hosting SIMADU

Dokumen ini berisi panduan lengkap untuk melakukan hosting aplikasi **SIMADU** (Sistem Informasi Manajemen dan Alokasi Kegiatan Tim Statistik Distribusi) pada server hosting (cPanel / Shared Hosting / VPS / Cloud).

---

## 📋 1. Hasil Audit & QA Kelayakan Hosting

| Komponen | Status | Keterangan QA |
|---|:---:|---|
| **Frontend Production Build** | ✅ **Lulus** | File build statis (`dist/`) berhasil digenerate (634 modul, 0 error). |
| **SPA Fallback Routing** | ✅ **Lulus** | `.htaccess` telah ditambahkan di frontend agar refresh halaman pada route React (`/tugas`, `/kalender`, `/laporan-perjalanan`) tidak mengalami HTTP 404. |
| **Backend & Dynamic Routing** | ✅ **Lulus** | Router pada `backend/index.php` mendukung eksekusi di root domain maupun subpath (`/api/...` dan `/backend/api/...`). |
| **Database Schema & Data** | ✅ **Lulus** | File dump mandiri `backend/database/simadu_hosting_ready.sql` (92.6 KB) siap diimpor, sudah mencakup 131 wilayah, 29 pegawai ASN, 327 mitra, dan akun admin Tim Distribusi (`rina`, `imelda`, `alief`, `superadmin`). |
| **Template Word SPPD** | ✅ **Lulus** | Template Word (`.docx`) telah disalin ke `backend/templates/` dengan resolver otomatis (`getTemplatePath`) yang mandiri saat dipindahkan ke server hosting. |
| **Proteksi Keamanan Upload** | ✅ **Lulus** | Folder `backend/uploads/` telah dilengkapi `.htaccess` khusus untuk memblokir eksekusi script PHP liar (*Anti-RCE*). |
| **Konfigurasi Lingkungan** | ✅ **Lulus** | Template konfigurasi `backend/config/config.example.php` telah disediakan untuk mempermudah pengaturan database di hosting. |

---

## 🖥️ 2. Persyaratan Minimum Server Hosting (*Requirements*)

* **PHP Version:** PHP 8.2 atau PHP 8.3+
* **Ekstensi PHP Wajib Diaktifkan (via cPanel *Select PHP Version*):**
  * `pdo_mysql` (Koneksi database)
  * `fileinfo` (Validasi keamanan MIME type file upload)
  * `gd` (Pemrosesan logo, favicon, gambar)
  * `zip` (Penyusunan paket arsip SPPD)
  * `xml` / `simplexml` / `xmlwriter` (Library PhpWord & PhpSpreadsheet)
  * `mbstring` (Pemrosesan karakter teks)
* **Web Server:** Apache / LiteSpeed (dengan modul `mod_rewrite` dan `mod_headers` aktif)
* **Database:** MySQL 8.0+ atau MariaDB 10.4+

---

## 📦 3. Struktur File yang Perlu Diunggah ke Hosting

Saat mengunggah ke hosting (misal folder `public_html/`):

```text
public_html/
├── assets/                 <-- Dari folder D:\Simadu\frontend\dist\assets\
├── favicon.png             <-- Dari folder D:\Simadu\frontend\dist\favicon.png
├── index.html              <-- Dari folder D:\Simadu\frontend\dist\index.html
├── .htaccess               <-- Dari folder D:\Simadu\frontend\dist\.htaccess
│
└── api/  (atau backend/)    <-- Dari seluruh isi folder D:\Simadu\backend\
    ├── config/
    │   ├── config.php      <-- Salin dari config.example.php & isi kredensial hosting
    │   └── database.php
    ├── controllers/
    ├── database/
    ├── middleware/
    ├── templates/          <-- 3 file template Word (.docx)
    ├── uploads/            <-- Folder penyimpanan berkas & foto (Izin: 755 / 775)
    │   └── .htaccess       <-- Proteksi anti-eksekusi PHP
    ├── vendor/             <-- Autoload library Composer (PhpWord, PhpSpreadsheet)
    ├── helpers.php
    ├── index.php           <-- Entry point router API
    └── .htaccess
```

---

## 🛠️ 4. Langkah-Langkah Deployment (Step-by-Step)

### Langkah 1: Buat Database & Import Data di Hosting
1. Buka **cPanel** → menu **MySQL Databases**.
2. Buat database baru (contoh: `u123456_simadu`).
3. Buat user database baru & buat password yang kuat, lalu berikan hak akses penuh (*ALL PRIVILEGES*) ke database tersebut.
4. Buka **phpMyAdmin**, pilih database `u123456_simadu`, klik tab **Import**.
5. Pilih file `D:\Simadu\backend\database\simadu_hosting_ready.sql` lalu klik **Import / Go**.

---

### Langkah 2: Konfigurasi Database Backend
1. Buka file `backend/config/config.example.php` lalu simpan sebagai `backend/config/config.php`.
2. Sesuaikan kredensial dengan database hosting yang baru dibuat:
   ```php
   return [
       'db' => [
           'host'    => 'localhost',       // atau 127.0.0.1
           'port'    => 3306,
           'name'    => 'u123456_simadu',  // nama database di hosting
           'user'    => 'u123456_simadu',  // username database di hosting
           'pass'    => 'PasswordAnda123!',// password database
           'charset' => 'utf8mb4',
       ],
       'app' => [
           'env'  => 'production',         // ubah ke 'production'
           'name' => 'SIMADU',
       ],
   ];
   ```

---

### Langkah 3: Upload Berkas ke File Manager
1. Unggah seluruh isi folder **`frontend/dist/`** langsung ke direktori `public_html/`.
2. Unggah folder **`backend/`** ke dalam `public_html/api/` (atau `public_html/backend/`).
3. Pastikan izin akses folder (*permissions*) untuk folder **`uploads/`** diatur ke **`0755`** atau **`0775`** agar PHP dapat menyimpan foto dokumentasi dan berkas upload.

---

### Langkah 4: Pengujian (*Smoke Test*) Setelah Online
1. Akses halaman utama website: `https://domain-anda.com/` (harus menampilkan halaman Login SIMADU).
2. Uji login menggunakan salah satu akun admin:
   * **Username:** `alief` / `rina` / `imelda`
   * **Password:** `bps1504`
3. Coba akses menu **Kelola Tugas**, **Kalender**, **Laporan Perjalanan**, dan **Manajemen Dokumen**.
4. Lakukan uji coba *refresh* browser (F5) pada halaman selain beranda (misal pada `/tugas`) untuk memastikan SPA Fallback berjalan mulus tanpa error 404.
