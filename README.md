# SIMADU — Sistem Monitoring Kegiatan Distribusi Terpadu

Dashboard monitoring progres petugas lapangan untuk **Tim Statistik Distribusi BPS Kabupaten Batang Hari**.

---

## Tech Stack

| Layer | Pilihan |
|---|---|
| Backend | PHP native (PDO + prepared statements) |
| Database | MySQL via Laragon |
| API | REST JSON: `{ "success": bool, "data": ..., "message": "" }` |
| Auth | Session-based PHP, role: `superadmin` / `admin` |
| Frontend | React + Vite + React Router + Tailwind CSS v3 |
| Dev server | Laragon (Apache + MySQL) |

---

## Struktur Folder

```
D:\Simadu\
├── backend/                → PHP REST API
│   ├── index.php           → Entry point router
│   └── .htaccess           → Apache rewrite rules
│
├── frontend/               → React + Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     → Layout.jsx, Sidebar.jsx, Topbar.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   ├── hooks/
│   │   │   └── useDarkMode.js
│   │   ├── pages/          → LoginPage, DashboardPage, NotFound, ...
│   │   ├── App.jsx         → React Router (semua route)
│   │   ├── main.jsx        → Entry point (dark mode init sebelum render)
│   │   └── index.css       → Tailwind + design tokens
│   ├── tailwind.config.js  → Design system tokens (Bagian 4)
│   └── vite.config.js      → Vite + proxy /api → Laragon backend
│
├── run-simadu.vbs          → Launcher (double-click untuk jalankan)
└── README.md
```

---

## Cara Menjalankan (Development)

### Cara Cepat — Double-click `run-simadu.vbs`

Skrip ini otomatis:
1. Memeriksa & menjalankan Laragon (Apache + MySQL) jika belum aktif
2. Menjalankan Vite dev server (`npm run dev`) di background
3. Menunggu ~3.5 detik, lalu membuka browser ke **http://localhost:5173**

> **Syarat:** Laragon terinstall di `C:\laragon\`. Jika berbeda, edit baris `laragonExe` di `run-simadu.vbs`.

### Cara Manual

```powershell
# Terminal 1 — pastikan Laragon sudah running (Apache + MySQL aktif)

# Terminal 2 — jalankan Vite dev server
cd D:\Simadu\frontend
npm run dev
```

Buka browser: **http://localhost:5173**

---

## Konfigurasi Laragon

Backend PHP diakses oleh Vite via proxy (lihat `frontend/vite.config.js`).
Proxy mengasumsikan:

```
Laragon Document Root → D:\Simadu
http://localhost/backend/ → D:\Simadu\backend\
```

**Cara set Document Root Laragon:**
`Menu Laragon → Laragon → Preferences → Root` → ubah ke `D:\Simadu`

Atau buat Virtual Host di Laragon:
`Menu Laragon → Sites → Add` → nama `simadu`, path `D:\Simadu`
Lalu update proxy di `vite.config.js` ke `target: 'http://simadu.test'`.

---

## Design System

Warna, font, dan shadow sudah dikonfigurasi penuh di `tailwind.config.js`:

| Token | Light | Dark |
|---|---|---|
| Navy (primary) | `#3E5C7E` | `#6E8CAC` |
| Orange (accent) | `#E8935A` | `#E8A272` |
| Background | `#FAF9F7` | `#1B2733` |
| Surface/Card | `#FFFFFF` | `#243544` |
| Text primary | `#2A3540` | `#D8DEE6` |

Dark mode: `darkMode: 'class'` — toggle via class `dark` di `<html>`.

---

## Urutan Build (Sesuai Spec)

- [x] **Tahap 1** — Skeleton project (selesai)
- [ ] **Tahap 2** — Database migration + seed
- [ ] **Tahap 3** — Autentikasi (login/logout/session)
- [ ] **Tahap 4** — CRUD Master Data
- [ ] **Tahap 5** — Tugas Kegiatan + import/export Excel
- [ ] **Tahap 6** — Dasbor Utama
- [ ] **Tahap 7** — Kegiatan Statistik & Sensus Ekonomi
- [ ] **Tahap 8** — Dokumen, Kalender, Tim & Organisasi
- [ ] **Tahap 9** — Log Aktivitas
- [ ] **Tahap 10** — Laporan Perjalanan Dinas
- [ ] **Tahap 11** — Radial progress component + dark mode polish
