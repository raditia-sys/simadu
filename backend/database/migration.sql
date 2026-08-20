-- =============================================================================
-- SIMADU — Database Migration
-- BPS Kabupaten Batang Hari — Tim Statistik Distribusi
--
-- MySQL 8.4 | Engine: InnoDB | Charset: utf8mb4
-- Semua constraint & index lengkap sesuai Bagian 5 Prompt SIMADU
-- =============================================================================

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS simadu
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE simadu;

-- Nonaktifkan FK check sementara agar bisa DROP TABLE tanpa urutan
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Drop tables jika sudah ada (urutan terbalik dari dependensi) ─────────────
DROP TABLE IF EXISTS laporan_perjalanan_dinas;
DROP TABLE IF EXISTS log_aktivitas;
DROP TABLE IF EXISTS dokumen;
DROP TABLE IF EXISTS tugas_kegiatan;
DROP TABLE IF EXISTS master_kegiatan;
DROP TABLE IF EXISTS master_survei;
DROP TABLE IF EXISTS petugas;
DROP TABLE IF EXISTS master_wilayah;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. USERS
-- Akun login SIMADU. 2 role: superadmin, admin.
-- Tidak ada akun petugas — petugas hanya data yang dimonitor.
-- =============================================================================
CREATE TABLE users (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nama          VARCHAR(100)    NOT NULL,
    username      VARCHAR(50)     NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    role          ENUM('superadmin','admin') NOT NULL DEFAULT 'admin',
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Akun login aplikasi SIMADU (superadmin & admin)';


-- =============================================================================
-- 2. MASTER_WILAYAH
-- Daftar wilayah level desa/kelurahan di Kab. Batang Hari.
-- rate_transport_lokal (Rupiah) dipakai untuk kalkulasi biaya perjalanan dinas.
-- =============================================================================
CREATE TABLE master_wilayah (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    kecamatan           VARCHAR(100)    NOT NULL,
    desa_kelurahan      VARCHAR(100)    NOT NULL,
    rate_transport_lokal DECIMAL(12,2)  NOT NULL DEFAULT 0.00
                         COMMENT 'Tarif transport lokal (Rp) untuk kalkulasi perjalanan dinas',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_wilayah_kecamatan (kecamatan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Master wilayah desa/kelurahan dengan tarif transport lokal';


-- =============================================================================
-- 3. PETUGAS
-- Petugas lapangan yang dimonitor. Dua tipe:
--   pegawai = ASN/staf tetap BPS
--   mitra   = petugas lapangan non-ASN (mitra statistik)
-- =============================================================================
CREATE TABLE petugas (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nama                VARCHAR(100)    NOT NULL,
    tipe                ENUM('pegawai','mitra') NOT NULL,
    nip_atau_kode_mitra VARCHAR(50)     NULL     COMMENT 'NIP (pegawai) atau kode mitra',
    kontak              VARCHAR(100)    NULL     COMMENT 'No. HP / email',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_petugas_tipe (tipe)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Petugas lapangan yang dimonitor (pegawai ASN & mitra statistik)';


-- =============================================================================
-- 4. MASTER_SURVEI
-- Daftar survei/kegiatan statistik. Setiap survei memiliki jenis periode
-- yang menentukan field tugas mana yang wajib diisi.
-- =============================================================================
CREATE TABLE master_survei (
    id                       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nama_survei              VARCHAR(150)    NOT NULL,
    kode_survei              VARCHAR(20)     NULL
                             COMMENT 'Kode/singkatan survei (misal: SAPB, HD, SHPB)',
    kategori                 ENUM('Distribusi','Harga','KTIP','Sensus') NOT NULL,
    jenis_periode            ENUM('mingguan','bulanan','triwulanan','tahunan') NOT NULL
                             COMMENT 'Menentukan field periode wajib di tugas_kegiatan',
    tautan_entri_data        VARCHAR(500)    NULL
                             COMMENT 'URL eksternal ke sistem entri data (dibuka di tab baru)',
    materi_dokumen           TEXT            NULL
                             COMMENT 'Deskripsi / link materi & dokumen survei',
    bulan_mulai              TINYINT UNSIGNED NULL CHECK (bulan_mulai BETWEEN 1 AND 12)
                             COMMENT 'Bulan mulai pelaksanaan (khusus jenis_periode=tahunan)',
    bulan_selesai            TINYINT UNSIGNED NULL CHECK (bulan_selesai BETWEEN 1 AND 12)
                             COMMENT 'Bulan selesai pelaksanaan (khusus jenis_periode=tahunan)',
    tanggal_mulai_koleksi    TINYINT UNSIGNED NULL CHECK (tanggal_mulai_koleksi BETWEEN 1 AND 31)
                             COMMENT 'Tanggal mulai pengumpulan data dalam satu periode',
    tanggal_selesai_koleksi  TINYINT UNSIGNED NULL CHECK (tanggal_selesai_koleksi BETWEEN 1 AND 31)
                             COMMENT 'Tanggal selesai pengumpulan data dalam satu periode',
    created_at               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_survei_kategori (kategori)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Master survei & kegiatan statistik dengan metadata periode dan entri data';


-- =============================================================================
-- 5. MASTER_KEGIATAN
-- Jenis peran petugas (bukan aktivitas umum).
-- 7 peran standar di-seed langsung setelah create table.
-- =============================================================================
CREATE TABLE master_kegiatan (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nama        VARCHAR(150)    NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_kegiatan_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Jenis peran petugas dalam survei (Pemeriksaan, Pendataan, dst.)';


-- =============================================================================
-- 6. TUGAS_KEGIATAN
-- Entitas inti. 1 baris = 1 petugas, 1 wilayah/desa, 1 survei, 1 peran.
--
-- Aturan bisnis penting:
-- • status TIDAK disimpan — dihitung dari (sampel_selesai / target_sampel):
--     0%       = Belum Mulai
--     1–99%    = Berjalan
--     100%     = Selesai
-- • minggu_ke hanya boleh 1 atau 2 (CHECK constraint)
-- • field periode diisi sesuai jenis_periode survei terkait:
--     mingguan   → bulan + minggu_ke wajib
--     bulanan    → bulan wajib
--     triwulanan → triwulan_ke wajib
--     tahunan    → hanya tahun (bulan/minggu/triwulan NULL)
-- • Unique constraint: satu petugas tidak boleh punya >1 peran dalam
--   survei+wilayah+periode yang sama
-- =============================================================================
CREATE TABLE tugas_kegiatan (
    id              INT UNSIGNED    NOT NULL AUTO_INCREMENT,

    -- Relasi
    survei_id       INT UNSIGNED    NOT NULL,
    wilayah_id      INT UNSIGNED    NOT NULL,
    petugas_id      INT UNSIGNED    NOT NULL,
    kegiatan_id     INT UNSIGNED    NOT NULL  COMMENT 'Peran petugas (FK→master_kegiatan)',

    -- Periode
    tahun           SMALLINT UNSIGNED NOT NULL COMMENT 'Tahun kegiatan (wajib selalu)',
    triwulan_ke     TINYINT UNSIGNED  NULL     CHECK (triwulan_ke BETWEEN 1 AND 4)
                    COMMENT 'Isi jika jenis_periode = triwulanan',
    bulan           TINYINT UNSIGNED  NULL     CHECK (bulan BETWEEN 1 AND 12)
                    COMMENT 'Isi jika jenis_periode = bulanan atau mingguan',
    minggu_ke       TINYINT UNSIGNED  NULL     CHECK (minggu_ke IN (1, 2))
                    COMMENT 'Isi jika jenis_periode = mingguan. Hanya 1 atau 2.',

    -- Target & realisasi (status dihitung dari keduanya)
    target_sampel   SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Jumlah sampel yang ditugaskan',
    sampel_selesai  SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Realisasi sampel selesai',
    deadline        DATE              NOT NULL,

    -- Audit
    created_by      INT UNSIGNED    NULL     COMMENT 'FK→users.id (user yang input data)',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- Satu petugas, satu peran, dalam survei+wilayah+periode yang sama = unik
    UNIQUE KEY uq_tugas_periode (survei_id, wilayah_id, petugas_id, kegiatan_id,
                                  tahun, triwulan_ke, bulan, minggu_ke),

    -- Foreign keys
    CONSTRAINT fk_tugas_survei    FOREIGN KEY (survei_id)   REFERENCES master_survei   (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tugas_wilayah   FOREIGN KEY (wilayah_id)  REFERENCES master_wilayah  (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tugas_petugas   FOREIGN KEY (petugas_id)  REFERENCES petugas         (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tugas_kegiatan  FOREIGN KEY (kegiatan_id) REFERENCES master_kegiatan (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_tugas_creator   FOREIGN KEY (created_by)  REFERENCES users           (id) ON DELETE SET NULL ON UPDATE CASCADE,

    -- Index untuk query monitoring per survei/wilayah/tahun
    KEY idx_tugas_survei_tahun   (survei_id, tahun),
    KEY idx_tugas_wilayah        (wilayah_id),
    KEY idx_tugas_petugas        (petugas_id),
    KEY idx_tugas_deadline       (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tugas petugas per survei-wilayah-periode (entitas inti monitoring)';


-- =============================================================================
-- 7. DOKUMEN
-- Arsip dokumen yang bisa di-upload dan didownload.
-- =============================================================================
CREATE TABLE dokumen (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nama_file   VARCHAR(255)    NOT NULL,
    path        VARCHAR(500)    NOT NULL  COMMENT 'Path relatif dari root backend',
    kategori    VARCHAR(100)    NULL      COMMENT 'Kategori/tag dokumen',
    uploaded_by INT UNSIGNED    NULL      COMMENT 'FK→users.id',
    uploaded_at TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_dokumen_uploader FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_dokumen_kategori (kategori),
    KEY idx_dokumen_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Arsip dokumen survei (upload/download)';


-- =============================================================================
-- 8. LOG_AKTIVITAS
-- Audit trail semua aksi yang dilakukan user. Hanya tampil ke superadmin.
-- =============================================================================
CREATE TABLE log_aktivitas (
    id      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED    NULL     COMMENT 'FK→users.id (NULL jika user sudah dihapus)',
    aksi    VARCHAR(100)    NOT NULL COMMENT 'Jenis aksi: CREATE, UPDATE, DELETE, LOGIN, dll.',
    objek   VARCHAR(100)    NULL     COMMENT 'Tabel/entitas yang diaksi: tugas_kegiatan, dokumen, dst.',
    detail  JSON            NULL     COMMENT 'Detail perubahan (before/after) dalam format JSON',
    waktu   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_log_user_id (user_id),
    KEY idx_log_waktu   (waktu),
    KEY idx_log_aksi    (aksi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit trail aktivitas user (hanya visible ke superadmin)';


-- =============================================================================
-- 9. LAPORAN_PERJALANAN_DINAS
-- Laporan SPPD. Struktur field standar SPPD instansi pemerintah Indonesia.
-- ⏳ Placeholder — field final menunggu template asli dari kantor.
--    Modul ini dibuat modular agar mudah disesuaikan.
-- =============================================================================
CREATE TABLE laporan_perjalanan_dinas (
    id                  INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    petugas_id          INT UNSIGNED    NOT NULL  COMMENT 'FK→petugas',
    nomor_surat         VARCHAR(100)    NULL      COMMENT 'Nomor surat tugas/SPPD',
    tujuan_wilayah_id   INT UNSIGNED    NULL      COMMENT 'FK→master_wilayah (untuk ambil rate_transport_lokal)',
    tanggal_berangkat   DATE            NOT NULL,
    tanggal_kembali     DATE            NOT NULL,
    maksud_perjalanan   TEXT            NULL      COMMENT 'Tujuan/maksud perjalanan dinas',
    biaya_transport     DECIMAL(12,2)   NOT NULL  DEFAULT 0.00
                        COMMENT 'Auto-hitung dari rate_transport_lokal wilayah tujuan',
    status_approval     ENUM('draft','diajukan','disetujui','ditolak') NOT NULL DEFAULT 'draft',
    created_by          INT UNSIGNED    NULL      COMMENT 'FK→users.id',
    created_at          TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_lpd_petugas  FOREIGN KEY (petugas_id)        REFERENCES petugas       (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lpd_wilayah  FOREIGN KEY (tujuan_wilayah_id) REFERENCES master_wilayah(id) ON DELETE SET NULL  ON UPDATE CASCADE,
    CONSTRAINT fk_lpd_creator  FOREIGN KEY (created_by)        REFERENCES users          (id) ON DELETE SET NULL  ON UPDATE CASCADE,

    KEY idx_lpd_petugas       (petugas_id),
    KEY idx_lpd_tanggal       (tanggal_berangkat),
    KEY idx_lpd_status        (status_approval)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Laporan Perjalanan Dinas / SPPD (placeholder — field final menunggu template kantor)';


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ── Users: default superadmin (password: 'simadu2025' — GANTI setelah deploy!) ──
INSERT INTO users (nama, username, password_hash, role) VALUES
('Super Administrator', 'superadmin', '$2y$12$placeholder_change_before_deploy_superadmin', 'superadmin'),
('Administrator', 'admin', '$2y$12$placeholder_change_before_deploy_admin', 'admin');
-- CATATAN: password_hash di atas adalah placeholder.
-- Ganti dengan hash bcrypt yang benar saat membangun modul auth (Tahap 3).
-- Gunakan: password_hash('password_baru', PASSWORD_BCRYPT, ['cost' => 12])

-- ── Master Kegiatan: 7 peran standar (sesuai Bagian 5) ───────────────────────
INSERT INTO master_kegiatan (id, nama) VALUES
(1, 'Petugas Pemeriksaan'),
(2, 'Petugas Pendataan'),
(3, 'Petugas Pemeriksaan Lapangan'),
(4, 'Petugas Pendataan Lapangan'),
(5, 'Petugas Pendataan Lapangan Listing'),
(6, 'Petugas Pemeriksa Listing'),
(7, 'Petugas Pemeriksa Lapangan');

-- ── Master Survei: survei-survei dari Bagian 3 (sidebar navigation) ───────────
-- ── Master Survei: survei-survei dari Bagian 3 (sidebar navigation) ───────────
INSERT INTO master_survei (nama_survei, kategori, jenis_periode) VALUES
-- Statistik Distribusi
('Survei Angkutan Penumpang dan Barang',                            'Distribusi', 'bulanan'),
-- Statistik Harga
('Survei Harga Perdesaan',                                          'Harga',      'mingguan'),
('Survei Harga Konsumen Perdesaan',                                 'Harga',      'mingguan'),
('Survei Harga Produsen',                                           'Harga',      'bulanan'),
('Survei Harga Perdagangan Besar',                                  'Harga',      'bulanan'),
('Survei Harga Kemahalan Konstruksi',                               'Harga',      'bulanan'),
-- KTIP
('Survei Keuangan Badan Usaha Milik Daerah',                         'KTIP',       'tahunan'),
('Survei Lembaga Keuangan - Koperasi Simpan Pinjam',                'KTIP',       'tahunan'),
('Survei Keuangan Konstruksi',                                      'KTIP',       'tahunan'),
('Survei Hotel dan Jasa Akomodasi Lainnya Tahunan',                 'KTIP',       'bulanan'),
('Survei Tingkat Penghunian Kamar Hotel',                           'KTIP',       'bulanan'),
-- Sensus Ekonomi
('Persiapan Sensus Ekonomi',                                        'Sensus',     'tahunan'),
('Pelaksanaan Sensus Ekonomi',                                      'Sensus',     'tahunan'),
('Pengolahan dan Diseminasi Sensus Ekonomi',                        'Sensus',     'tahunan');
