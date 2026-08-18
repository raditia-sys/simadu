# PROMPT — Bangun Aplikasi SIMADU (Fresh Build)

Kamu akan membangun **SIMADU**, aplikasi web dashboard monitoring untuk BPS Kabupaten Batang Hari (Tim Statistik Distribusi). Fungsinya: memantau progres petugas lapangan/mitra dalam mengerjakan berbagai survei & sensus statistik, menggantikan sistem lama berbasis Google Sites. Ini adalah **fresh build** — tidak ada codebase lama yang perlu dipertahankan atau dimigrasikan secara teknis.

---

## 1. Tech Stack (WAJIB diikuti)

| Layer | Pilihan |
|---|---|
| Backend | PHP native (tanpa framework berat) |
| Database | MySQL, akses via **PDO + prepared statements** (wajib, tidak boleh raw query rentan SQL injection) |
| API | REST API, response format JSON konsisten: `{ "success": bool, "data": ..., "message": "" }` |
| Autentikasi | Session-based PHP (bukan JWT), 2 role: `superadmin` dan `admin` |
| Frontend | **React** (via **Vite**) + **React Router** + **Tailwind CSS** |
| Dev lokal | Laragon (Apache + MySQL) |
| Deployment target | Shared hosting kantor berbasis PHP. Build React (`dist/`) di-serve sebagai static files dari server PHP yang sama (same-origin) agar tidak perlu menangani CORS untuk request API + cookie session |
| Excel import/export | Gunakan library PHP **PhpSpreadsheet** di sisi backend |

📌 Semua rute WAJIB nested di dalam Layout (Sidebar+Topbar) — jangan ada satu pun halaman fitur yang didefinisikan di luar struktur Layout. Cross-check setiap link di Sidebar dengan `<Route>` yang benar-benar terdaftar sebelum dianggap selesai. Tambahkan juga **React Error Boundary** di level Layout/Route, supaya kalau ada error runtime di halaman manapun, yang muncul adalah pesan error yang jelas — bukan halaman blank tanpa sidebar/topbar.

📌 Setiap endpoint backend untuk tiap fitur harus benar-benar diimplementasikan penuh, bukan sekadar placeholder yang membuat frontend crash saat fetch (termasuk Laporan Perjalanan Dinas — lihat field placeholder di Bagian 5, tapi endpoint & error handling-nya tetap harus solid).

**Struktur folder yang disarankan:**
```
/backend            → PHP REST API (routes, controllers, PDO models)
/frontend           → React + Vite app (source)
/frontend/dist       → hasil build, di-copy/deploy ke root PHP saat production
```

**Skrip jalankan lokal (WAJIB dibuat):** sediakan file `run-simadu.vbs` di root folder proyek yang bisa dijalankan cukup dengan double-click (tanpa perlu buka terminal atau ketik URL manual). Skrip ini harus:
1. Memastikan service Laragon (Apache + MySQL) sudah berjalan.
2. Menjalankan Vite dev server untuk frontend (`npm run dev`) di proses/background terpisah.
3. Menunggu beberapa detik sampai dev server siap, lalu membuka browser default secara otomatis ke URL lokal aplikasi.

Karena backend PHP dan Vite dev server berjalan di origin/port berbeda saat development, konfigurasikan **Vite dev server proxy** (`vite.config.js` → `server.proxy`) supaya semua request `/api/*` dari frontend diteruskan ke backend PHP secara same-origin — ini penting agar session cookie PHP tersimpan benar di browser (menghindari masalah cross-origin cookie yang sempat jadi penyebab bug login sebelumnya). Cantumkan cara pakai skrip ini secara singkat di README project.

---

## 2. Role & Hak Akses

Dua role: **Superadmin** (akses penuh) dan **Admin** (akses terbatas). Tidak ada akun untuk petugas lapangan/mitra — mereka hanya data yang dimonitor, bukan pengguna sistem.

| Fitur | Superadmin | Admin |
|---|---|---|
| Dasbor Utama (semua widget) | ✅ | ✅ |
| Kegiatan Statistik (lihat) | ✅ | ✅ |
| Sensus Ekonomi (lihat) | ✅ | ✅ |
| Kelola Tugas — tambah (form/Excel) | ✅ | ❌ |
| Kelola Tugas — edit progres | ✅ | ✅ |
| Kelola Tugas — hapus | ✅ | ❌ |
| Kelola Tugas — update/hapus massal | ✅ | ❌ |
| Dokumen — upload | ✅ | ✅ |
| Dokumen — download | ✅ | ✅ |
| Dokumen — edit | ✅ | ❌ |
| Dokumen — hapus arsip | ✅ | ❌ |
| Laporan Perjalanan Dinas | ✅ | ✅ |
| Kalender & Agenda | ✅ | ✅ |
| Tim & Organisasi | ✅ | ✅ |
| Log + Aktivitas | ✅ | ❌ |
| Master Data (semua) | ✅ | ❌ |

**Penting:** proteksi role harus ditegakkan di **backend** (middleware/guard di setiap endpoint), bukan cuma disembunyikan di UI React. 📌 Khususnya **Master Data** dan **Log + Aktivitas** hanya boleh muncul — baik di sidebar maupun saat endpoint diakses langsung — untuk role `superadmin`. Jangan sampai bocor ke `admin`.

---

## 3. Struktur Navigasi

### Superadmin
```
SIMADU
├── Dasbor Utama                    (filter: tahun/bulan)
├── Kegiatan Statistik              (tiap kegiatan = halaman sendiri: bar monitoring +
│    ├── Statistik Distribusi        tautan entri data + materi & dokumen)
│    │    └── SAPB
│    ├── Statistik Harga
│    │    ├── SHPed              (folder pembungkus — TIDAK punya halaman sendiri)
│    │    │    ├── HD
│    │    │    └── HKD
│    │    ├── SHP
│    │    ├── SHPB
│    │    └── SHKK
│    └── KTIP
│         ├── BUMD
│         ├── SLK-KSP
│         ├── K3
│         ├── VHTL
│         └── VHTS
├── Sensus Ekonomi                  (top-level, terpisah dari Kegiatan Statistik)
│    ├── Persiapan
│    ├── Pelaksanaan
│    └── Pengolahan & Diseminasi
├── Kelola Tugas Kegiatan
├── Manajemen Dokumen
├── Laporan Perjalanan Dinas
├── Kalender & Agenda
├── Tim & Organisasi
├── Log + Aktivitas                 (khusus superadmin)
└── Master Data                     (khusus superadmin)
     ├── Master Wilayah
     ├── Master Pegawai
     ├── Master Mitra
     ├── Master Survei
     └── Master Kegiatan
```

### Admin
Sama seperti di atas MINUS **Log + Aktivitas** dan **Master Data**, dengan hak terbatas seperti di matriks Bagian 2.

**Layout:** sidebar kiri tetap (collapsible di mobile) untuk menampung ±10 item nav level-atas. Top bar berisi breadcrumb halaman aktif, toggle dark/light mode, dan info user + logout.

📌 Semua item navigasi di atas WAJIB diimplementasikan lengkap — termasuk **Kelola Tugas Kegiatan** dan **Log + Aktivitas**. Jangan ada item yang terlewat atau baru berupa placeholder kosong.

---

## 4. Design System (WAJIB diikuti persis)

### Warna — Light (soft/muted — bukan warna solid tajam)
- Navy (primer): `#3E5C7E` — header, sidebar, tombol utama, status "Selesai"
- Oranye (aksen): `#E8935A` — CTA, highlight, elemen aktif, status "Berjalan"
- Abu-abu netral (status "Belum Mulai"): `#C3CBD3`
- Background halaman: `#FAF9F7` (putih hangat, bukan putih tajam)
- Card/surface: `#FFFFFF`
- Teks utama: `#2A3540`
- Teks sekunder: `#7C8A9A`
- Border/divider: `#E7E5E1`

### Warna — Dark (soft/muted — bukan hitam pekat / neon)
- Background halaman: `#1B2733`
- Card/surface: `#243544`
- Navy aksen (status "Selesai"): `#6E8CAC` — lebih terang dari background supaya tetap kebaca
- Oranye (aksen): `#E8A272` — tetap muted, jangan terlalu terang/neon
- Abu-abu netral (status "Belum Mulai"): `#4E5D6C`
- Teks utama: `#D8DEE6`
- Teks sekunder: `#93A2B0`
- Border/divider: `#33455A`

> Prinsip "soft": semua warna aksen (navy, oranye) memakai versi desaturasi/muted, bukan warna solid penuh saturasi. Hindari kontras tajam antara background dan card — transisinya harus terasa lembut, termasuk di shadow (pakai shadow tipis/blur besar, opacity rendah, bukan shadow gelap tegas).

### Pemetaan warna status (jangan tambah warna baru)
- **Belum Mulai** → abu-abu netral (lihat token di atas)
- **Berjalan** → oranye
- **Selesai** → navy

📌 Warna WAJIB persis mengikuti token di atas — **JANGAN menambah warna lain di luar palet ini** (percobaan build sebelumnya sempat menambahkan biru/hijau untuk kartu KPI di luar spesifikasi; ini tidak boleh terulang). Termasuk kartu KPI Dashboard: gunakan hanya navy/oranye/abu-abu/putih sesuai token di atas, dengan pemetaan status yang sama — bukan warna bebas per kartu.

### Tipografi
- Heading/Display: **Space Grotesk**
- Body/UI: **Inter**
- Angka/data di tabel: gunakan tabular numerals (Inter tabular-nums), atau **JetBrains Mono** untuk tabel data besar

### Dark/Light Mode
Toggle di top bar. 📌 Gunakan `darkMode: 'class'` di `tailwind.config.js`, toggle dengan menambah/hapus class `dark` di `document.documentElement`, dan pastikan TIDAK ada `useEffect` dengan dependency array salah yang menimpa ulang class tersebut di setiap render (penyebab bug toggle tidak berfungsi di percobaan sebelumnya).

### Signature element (elemen visual khas SIMADU)
Semua indikator progres (Dasbor, per-survei, per-wilayah) memakai **radial/circular progress ring**, bukan bar datar — dengan transisi warna eksplisit mengikuti token di atas: abu-abu (0%) → oranye (berjalan) → navy (100%), semua versi soft/muted sesuai token. Pakai komponen ini konsisten di seluruh aplikasi sebagai identitas visual.

Konfigurasikan semua warna ini sebagai custom theme di `tailwind.config.js` (jangan hardcode hex di tiap komponen).

---

## 5. Skema Database

### `users`
id, nama, username, password_hash, role (`superadmin` / `admin`)

### `master_wilayah`
id, kecamatan, desa_kelurahan, **rate_transport_lokal** (decimal, Rupiah — dipakai untuk kalkulasi biaya di Laporan Perjalanan Dinas)

### `petugas`
id, nama, **tipe** (`pegawai` / `mitra`), nip_atau_kode_mitra, kontak
> `pegawai` = ASN/staf tetap BPS. `mitra` = petugas lapangan non-ASN (mitra statistik).

### `master_survei`
id, nama_survei, kategori (`Distribusi` / `Harga` / `KTIP` / `Sensus`), **jenis_periode** (`mingguan` / `bulanan` / `triwulanan` / `tahunan`), tautan_entri_data (URL eksternal statis, link ke sistem entri data lain — bukan dibangun di SIMADU), materi_dokumen

### `master_kegiatan` (jenis peran petugas — bukan aktivitas umum)
Seed data awal (7 peran, semuanya berbeda meski nama mirip):
1. Petugas Pemeriksaan
2. Petugas Pendataan
3. Petugas Pemeriksaan Lapangan
4. Petugas Pendataan Lapangan
5. Petugas Pendataan Lapangan Listing
6. Petugas Pemeriksa Listing
7. Petugas Pemeriksa Lapangan

### `tugas_kegiatan` (entitas inti — 1 baris = 1 petugas, 1 wilayah/desa, 1 survei, 1 peran)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | PK | |
| survei_id | FK → master_survei | |
| wilayah_id | FK → master_wilayah | level desa/kelurahan |
| petugas_id | FK → petugas | |
| kegiatan_id | FK → master_kegiatan | |
| tahun | int | selalu wajib |
| triwulan_ke | int (1–4), nullable | isi jika `jenis_periode` survei = triwulanan |
| bulan | int (1–12), nullable | isi jika bulanan/mingguan |
| minggu_ke | int (**hanya 1 atau 2**), nullable | isi jika mingguan |
| target_sampel | int | jumlah sampel/muatan ditugaskan |
| sampel_selesai | int | realisasi |
| deadline | date | |
| created_by, created_at, updated_at | | untuk Log Aktivitas |

> **`status` TIDAK disimpan sebagai kolom.** Hitung otomatis di query/response API dari rasio `sampel_selesai / target_sampel`: 0% = Belum Mulai, 1–99% = Berjalan, 100% = Selesai. Validasi form: `minggu_ke` hanya boleh diisi 1 atau 2, field periode yang wajib mengikuti `jenis_periode` survei terkait.
> Aturan bisnis: satu petugas tidak boleh punya lebih dari satu peran (`kegiatan_id`) dalam survei yang sama pada periode yang sama — tapi boleh punya banyak sampel dalam satu baris tugas yang sama.

### `dokumen`
id, nama_file, path, kategori, uploaded_by, uploaded_at

### `log_aktivitas`
id, user_id, aksi, objek, detail, waktu

### `laporan_perjalanan_dinas`
⏳ **Placeholder — template SPPD resmi kantor belum tersedia.** Gunakan struktur field standar SPPD instansi pemerintah Indonesia sebagai default sementara:
id, petugas_id (FK), nomor_surat, tujuan (FK → master_wilayah, untuk ambil `rate_transport_lokal`), tanggal_berangkat, tanggal_kembali, maksud_perjalanan, biaya_transport (auto-hitung dari `rate_transport_lokal` wilayah tujuan), status_approval, created_by, created_at.
Buat modul ini modular/mudah diubah — field final akan disesuaikan begitu template asli tersedia.

---

## 6. Spesifikasi Fitur per Halaman

**Halaman Login** — sederhana, satu card terpusat (vertikal & horizontal) di tengah viewport, tanpa elemen lain di sekelilingnya (tanpa gambar split-screen, tanpa background pattern). Detail:
- Background halaman: warna background light theme (`#FAF9F7`) / dark theme (`#1B2733`)
- Card: putih (`#FFFFFF`) di light / surface gelap (`#243544`) di dark, rounded corner besar, shadow halus (tipis, blur besar, sesuai prinsip "soft" di Bagian 4), lebar maksimum ±420px, padding cukup lega
- Bagian atas card, urut ke bawah, semua center-align:
  1. Ikon logo — kotak rounded dengan gradient **navy → oranye** (pakai warna dari Bagian 4, bukan warna lain) berisi ikon bar-chart putih di tengah
  2. Judul **"SIMADU"** — bold, besar (±text-3xl), warna navy/teks utama
  3. Tagline 2 baris: **"Sistem Monitoring Untuk Kegiatan Distribusi Terpadu"** — teks abu-abu sekunder, lebih kecil dari judul
- Form (di bawah tagline, ada jarak yang cukup):
  1. Label **"Username / NIP"** + input teks, placeholder *"Masukkan NIP atau username"*
  2. Label **"Kata Sandi"** + input password, placeholder *"Masukkan kata sandi"*
  3. Tombol **"Masuk"** — lebar penuh (full-width card), background oranye solid, teks putih, ada ikon panah-masuk kecil di kiri teks, rounded corner
- Tidak ada elemen tambahan lain di halaman ini (tidak ada link "lupa password", tidak ada opsi lain) — sesuai keputusan sebelumnya bahwa reset password tidak diperlukan.
- Terapkan juga versi dark mode-nya mengikuti token warna dark di Bagian 4.
- 📌 Pastikan `onSubmit` memanggil `e.preventDefault()`, handler benar-benar terhubung ke fungsi pemanggil API, dan setelah response sukses diterima, lakukan redirect via `navigate()` dari react-router (bukan dibiarkan diam di halaman login — ini penyebab bug login tidak berpindah halaman di percobaan sebelumnya).

**Dasbor Utama** — filter tahun/bulan di atas. 4 KPI card (total kegiatan, kegiatan berjalan, kegiatan selesai, rata-rata capaian %), grafik batang persentase penyelesaian (filter: kecamatan/desa/kegiatan), panel pengingat deadline mendekat (in-app, dihitung dari `tugas_kegiatan.deadline` vs tanggal hari ini — tidak perlu email/WA), tabel/chart progres per kecamatan-desa (breakdown agregat dari `tugas_kegiatan`), kalender mini.

**Kegiatan Statistik & Sensus Ekonomi** — satu template halaman dipakai berulang, otomatis terfilter sesuai survei/tahap yang dibuka (routing dinamis, misal `/kegiatan/:surveiId`). Isi: bar monitoring progres (radial ring signature element), tautan entri data (buka link eksternal di tab baru), materi & dokumen terkait survei tsb.
> Catatan: **SHPed** di sidebar hanya berfungsi sebagai submenu pembungkus (expand/collapse untuk menampilkan HD & HKD) — dia sendiri tidak punya halaman/route, sama seperti perilaku "Kegiatan Statistik" dan "Sensus Ekonomi" di level atas.
> Catatan terbuka: apakah 3 tahap Sensus Ekonomi (Persiapan/Pelaksanaan/Pengolahan & Diseminasi) pakai template identik dengan Kegiatan Statistik — belum dikonfirmasi user. **Default: pakai template yang sama** untuk konsistensi, mudah dipisahkan nanti kalau ternyata perlu beda.

**Kelola Tugas Kegiatan** — tabel semua `tugas_kegiatan` dengan filter/pencarian. Superadmin: tombol tambah (modal form manual ATAU upload Excel — sediakan juga tombol download template Excel kosong), tombol edit/hapus per baris, checkbox multi-select untuk update/hapus status massal. Admin: hanya bisa klik edit pada kolom `sampel_selesai` per baris (tidak ada tombol tambah/hapus/massal — sembunyikan di UI **dan** tolak di backend).

**Manajemen Dokumen** — daftar dokumen dengan kategori, upload (drag-drop), download. Superadmin dapat tombol edit metadata dan hapus; Admin hanya upload+download.

**Laporan Perjalanan Dinas** — form buat laporan baru (pilih petugas, wilayah tujuan → auto-isi biaya transport, tanggal, maksud), daftar laporan yang sudah dibuat.

**Kalender & Agenda** — tampilan bulanan/mingguan, agregat deadline dari `tugas_kegiatan` + event manual (jika ada), cegah bentrok jadwal secara visual.

**Tim & Organisasi** — daftar kontak dari tabel `petugas` (pegawai & mitra), tampilkan nama, tipe, kontak.

**Log + Aktivitas** (superadmin saja) — tabel kronologis dari `log_aktivitas`, filter per user/tanggal/jenis aksi.

**Master Data** (superadmin saja) — CRUD standar untuk kelima tabel master (Wilayah — termasuk field rate transport, Pegawai, Mitra, Survei — termasuk jenis_periode & tautan entri data, Kegiatan/peran).

---

## 7. Urutan Pembangunan yang Disarankan

1. Setup skeleton project (`/backend` PHP + `/frontend` Vite React), konfigurasi Tailwind dengan design tokens di atas
2. Migration SQL untuk semua tabel di Bagian 5 + seed data `master_kegiatan` (7 peran)
3. Sistem autentikasi (login/logout session) + middleware role-check
4. CRUD Master Data (fondasi untuk fitur lain)
5. `tugas_kegiatan` CRUD + logika status otomatis + import/export Excel
6. Dasbor Utama (query agregasi + chart)
7. Halaman Kegiatan Statistik & Sensus Ekonomi (template dinamis)
8. Manajemen Dokumen, Kalender & Agenda, Tim & Organisasi
9. Log Aktivitas
10. Laporan Perjalanan Dinas (versi placeholder, tandai TODO untuk disesuaikan)
11. Terapkan signature radial progress component + dark mode toggle di seluruh halaman

---

## 8. Hal yang Masih Terbuka (jangan diblokir, buat asumsi wajar & mudah diubah)

1. Template halaman Sensus Ekonomi sama dengan Kegiatan Statistik atau beda — default: sama.
2. Field final Laporan Perjalanan Dinas — menunggu template SPPD asli dari kantor, gunakan placeholder di Bagian 5.
3. Laporan Perjalanan Dinas — apakah Admin hanya bisa lihat/edit laporan miliknya sendiri, atau semua laporan (lintas user) bisa dilihat siapa pun yang punya akses ke menu ini? Apakah perlu alur approval (misal Superadmin approve laporan yang dibuat Admin)? Default sementara: semua user dengan akses menu ini bisa lihat semua laporan, tanpa approval — sesuaikan kalau ternyata perlu dibatasi.
