import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import ProfileModal from './ProfileModal';

// ─── Route → breadcrumb label map ────────────────────────────────────────────
const BREADCRUMB_MAP = {
  '/dashboard':               ['Dasbor Utama'],
  '/statistik/sapb':          ['Kegiatan Statistik', 'Statistik Distribusi', 'SAPB'],
  '/harga/hd':                ['Kegiatan Statistik', 'Statistik Harga', 'SHPed', 'HD'],
  '/harga/hkd':               ['Kegiatan Statistik', 'Statistik Harga', 'SHPed', 'HKD'],
  '/harga/shp':               ['Kegiatan Statistik', 'Statistik Harga', 'SHP'],
  '/harga/shpb':              ['Kegiatan Statistik', 'Statistik Harga', 'SHPB', 'SHPB Bulanan'],
  '/harga/shpb-mingguan':     ['Kegiatan Statistik', 'Statistik Harga', 'SHPB', 'SHPB Mingguan'],
  '/harga/shkk':              ['Kegiatan Statistik', 'Statistik Harga', 'SHKK'],
  '/ktip/bumd':               ['Kegiatan Statistik', 'KTIP', 'BUMD'],
  '/ktip/slk':                ['Kegiatan Statistik', 'KTIP', 'SLK-KSP'],
  '/ktip/k3':                 ['Kegiatan Statistik', 'KTIP', 'K3'],
  '/ktip/vhtl':               ['Kegiatan Statistik', 'KTIP', 'VHTL'],
  '/ktip/vhts':               ['Kegiatan Statistik', 'KTIP', 'VHTS'],
  '/se2026/persiapan':        ['Sensus Ekonomi', 'Persiapan'],
  '/se2026/pelaksanaan':      ['Sensus Ekonomi', 'Pelaksanaan'],
  '/se2026/pengolahan':       ['Sensus Ekonomi', 'Pengolahan & Diseminasi'],
  '/kelola-tugas':            ['Kelola Tugas Kegiatan'],
  '/dokumen':                 ['Manajemen Dokumen'],
  '/perjalanan':              ['Laporan Perjalanan Dinas'],
  '/kalender':                ['Kalender & Agenda'],
  '/tim':                     ['Tim & Organisasi'],
  '/log':                     ['Administrasi', 'Log Aktivitas'],
  '/master/wilayah':          ['Master Data', 'Wilayah'],
  '/master/pegawai':          ['Master Data', 'Pegawai'],
  '/master/mitra':            ['Master Data', 'Mitra'],
  '/master/survei':           ['Master Data', 'Survei'],
  '/master/kegiatan':         ['Master Data', 'Kegiatan'],
  '/master/users':            ['Master Data', 'Akun Admin'],
};

export default function Topbar({ isDark, onToggleDark, onToggleSidebar, sidebarCollapsed }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const crumbs = BREADCRUMB_MAP[location.pathname] || ['Halaman'];

  useEffect(() => {
    const pageTitle = crumbs.length > 0 ? crumbs[crumbs.length - 1] : '';
    document.title = pageTitle ? `SIMADU - ${pageTitle}` : 'SIMADU';
  }, [location.pathname, crumbs]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar-h flex items-center justify-between px-4 gap-4 border-b border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface flex-shrink-0">

      {/* ── Left: Sidebar toggle + Breadcrumb ── */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10 transition-all flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
          {crumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1.5 min-w-0">
              {idx > 0 && (
                <svg className="w-3 h-3 text-text-secondary/50 dark:text-dark-text-secondary/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
              <span className={`text-sm truncate ${
                idx === crumbs.length - 1
                  ? 'font-semibold text-text-primary dark:text-dark-text-primary'
                  : 'text-text-secondary dark:text-dark-text-secondary'
              }`}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* ── Right: Notifications + Dark mode toggle + User info ── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Notifikasi Web Push & Email */}
        <NotificationBell />

        <button
          id="dark-mode-toggle"
          onClick={onToggleDark}
          title={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
          aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10 transition-all"
        >
          {isDark ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          )}
        </button>

        <div className="w-px h-5 bg-border-soft dark:bg-dark-border-soft" />

        {/* User Info & Profile Modal Trigger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            title="Klik untuk buka Profil & Pengaturan Notifikasi"
            className="flex items-center gap-2 p-1 -m-1 rounded-xl hover:bg-navy/5 dark:hover:bg-dark-navy/10 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-navy/10 dark:bg-dark-navy/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-navy dark:text-dark-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-xs font-semibold text-text-primary dark:text-dark-text-primary leading-tight truncate max-w-28">
                {user?.nama || '—'}
              </p>
              <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary leading-tight capitalize">
                {user?.role || 'admin'}
              </p>
            </div>
          </button>

          <button
            id="logout-btn"
            title="Keluar"
            aria-label="Logout"
            className="p-1.5 rounded-lg text-text-secondary hover:text-accent-orange hover:bg-accent-orange/5 dark:text-dark-text-secondary dark:hover:text-dark-accent-orange dark:hover:bg-dark-accent-orange/10 transition-all"
            onClick={handleLogout}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modal Profil & Pengaturan Notifikasi */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </header>
  );
}
