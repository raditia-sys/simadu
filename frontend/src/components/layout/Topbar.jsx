import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import ChangeMyPasswordModal from './ChangeMyPasswordModal';

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

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [changePassOpen, setChangePassOpen]     = useState(false);
  const dropdownRef = useRef(null);

  const crumbs = BREADCRUMB_MAP[location.pathname] || ['Halaman'];

  useEffect(() => {
    const pageTitle = crumbs.length > 0 ? crumbs[crumbs.length - 1] : '';
    document.title = pageTitle ? `SIMADU - ${pageTitle}` : 'SIMADU';
  }, [location.pathname, crumbs]);

  // Tutup user dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    }
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  async function handleLogout() {
    setUserDropdownOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar-h flex items-center justify-between px-4 gap-4 border-b border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface flex-shrink-0 relative z-30">

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

        {/* Notifikasi Web Push */}
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

        {/* User Profile Popover Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen(prev => !prev)}
            title="Klik untuk membuka menu akun"
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-navy/5 dark:hover:bg-dark-navy/10 transition-colors text-left border border-transparent hover:border-border-soft dark:hover:border-dark-border-soft"
          >
            <div className="w-7 h-7 rounded-lg bg-navy/10 dark:bg-dark-navy/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-navy dark:text-dark-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-xs font-semibold text-text-primary dark:text-dark-text-primary leading-tight truncate max-w-32">
                {user?.nama || 'Pengguna'}
              </p>
              <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary leading-tight capitalize">
                {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
            <svg className={`w-3.5 h-3.5 text-text-secondary transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* User Popover Menu */}
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface dark:bg-dark-surface border border-border-soft dark:border-dark-border-soft shadow-soft-xl p-3 z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-3">
              {/* Profile Card Header */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-soft dark:border-dark-border-soft space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-text-primary dark:text-dark-text-primary truncate">
                    {user?.nama || '—'}
                  </p>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy capitalize">
                    {user?.role || 'admin'}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary">
                  Username: <span className="font-mono">{user?.username}</span>
                </p>
                <div className="flex items-center gap-1 text-[11px] text-text-secondary dark:text-dark-text-secondary pt-0.5 truncate" title={user?.email || 'Email belum diatur'}>
                  <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  <span className="truncate">{user?.email || 'Email belum diatur'}</span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="space-y-1 pt-1">
                {user?.role === 'superadmin' && (
                  <Link
                    to="/master/users"
                    onClick={() => setUserDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4 text-navy dark:text-dark-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    <span>Master Akun Admin</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    setChangePassOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span>Ganti Password Saya</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-accent-orange hover:bg-accent-orange/10 dark:text-dark-accent-orange dark:hover:bg-dark-accent-orange/15 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  <span>Keluar (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Ganti Password Mandiri */}
      <ChangeMyPasswordModal
        open={changePassOpen}
        onClose={() => setChangePassOpen(false)}
      />
    </header>
  );
}
