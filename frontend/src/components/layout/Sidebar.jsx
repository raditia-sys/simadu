import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// ─── Icon components (minimal SVG, no external dependency) ───────────────────
function Icon({ path, className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS = {
  dashboard:    'M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z',
  kegiatan:     'M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605',
  sensus:       'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  tugas:        'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
  dokumen:      'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  perjalanan:   'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  kalender:     'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  tim:          'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
  log:          'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z',
  master:       'M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75',
  chevronDown:  'M19.5 8.25l-7.5 7.5-7.5-7.5',
  chevronRight: 'M8.25 4.5l7.5 7.5-7.5 7.5',
  folder:       'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z',
  circle:       'M12 4.5v15m7.5-7.5h-15', // placeholder for sub-items
};

// ─── Indentation Padding Map ──────────────────────────────────────────────────
const PADDING_MAP = {
  0: 'pl-3',
  1: 'pl-7',
  2: 'pl-11',
  3: 'pl-[3.75rem]', // 60px — deeper indent for items inside sub-folders like SHPed
  4: 'pl-[4.5rem]',
};

// ─── NavItem — leaf navigation link ──────────────────────────────────────────
function NavItem({ to, icon, label, indent = 0 }) {
  const paddingLeft = PADDING_MAP[indent] || 'pl-[4.5rem]';

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-item ${paddingLeft} ${isActive ? 'active' : ''}`
      }
    >
      {icon && <Icon path={ICONS[icon] || ICONS.circle} className="w-4 h-4 flex-shrink-0" />}
      {!icon && indent >= 3 && (
        <span className="w-1.5 h-1.5 rounded-full bg-text-secondary/40 dark:bg-dark-text-secondary/40 flex-shrink-0 mr-0.5" />
      )}
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

// ─── NavGroup — collapsible section ──────────────────────────────────────────
function NavGroup({ icon, label, indent = 0, activePrefixes = [], children }) {
  const location = useLocation();
  const isChildActive = activePrefixes.some((prefix) => location.pathname.startsWith(prefix));
  const [isOpen, setIsOpen] = useState(isChildActive);

  // Auto-collapse when user navigates to a route outside this group
  useEffect(() => {
    setIsOpen(isChildActive);
  }, [location.pathname, isChildActive]);

  const paddingLeft = PADDING_MAP[indent] || 'pl-[4.5rem]';

  return (
    <div>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`nav-item w-full ${paddingLeft} justify-between group ${
          isChildActive ? 'font-medium text-navy dark:text-dark-navy' : ''
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          {icon && <Icon path={ICONS[icon] || ICONS.folder} className="w-4 h-4 flex-shrink-0" />}
          <span className="truncate">{label}</span>
        </span>
        <Icon
          path={ICONS.chevronRight}
          className={`w-3.5 h-3.5 flex-shrink-0 opacity-60 transition-transform duration-300 ease-in-out ${
            isOpen ? 'rotate-90' : 'rotate-0'
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden space-y-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── NavFolder — non-link folder (like SHPed) ────────────────────────────────
function NavFolder({ label, indent = 1, activePrefixes = [], children }) {
  const location = useLocation();
  const isChildActive = activePrefixes.some((prefix) => location.pathname.startsWith(prefix));
  const [isOpen, setIsOpen] = useState(isChildActive);

  // Auto-collapse when user navigates to a route outside this folder
  useEffect(() => {
    setIsOpen(isChildActive);
  }, [location.pathname, isChildActive]);

  const paddingLeft = PADDING_MAP[indent] || 'pl-[4.5rem]';

  return (
    <div>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`nav-item w-full ${paddingLeft} justify-between ${
          isChildActive ? 'font-medium text-navy dark:text-dark-navy' : ''
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <Icon path={ICONS.folder} className="w-4 h-4 flex-shrink-0 opacity-70" />
          <span className="truncate">{label}</span>
        </span>
        <Icon
          path={ICONS.chevronRight}
          className={`w-3.5 h-3.5 flex-shrink-0 opacity-60 transition-transform duration-300 ease-in-out ${
            isOpen ? 'rotate-90' : 'rotate-0'
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 mt-0.5' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden space-y-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-dark-text-secondary/60 select-none">
      {label}
    </p>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
/**
 * Sidebar navigation.
 *
 * Props:
 * - collapsed (bool): whether the sidebar is in collapsed/icon-only mode
 * - userRole ('superadmin' | 'admin'): controls which menu items are visible
 */
export default function Sidebar({ collapsed = false, userRole = 'superadmin' }) {
  const isSuperadmin = userRole === 'superadmin';

  if (collapsed) {
    // Collapsed: icon-only sidebar (no labels)
    return (
      <aside className="flex flex-col h-full sidebar-w-collapsed sidebar-transition overflow-hidden border-r border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface">
        {/* Logo mark */}
        <div className="flex items-center justify-center h-14 border-b border-border-soft dark:border-dark-border-soft">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy to-accent-orange flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-none py-3 px-2 space-y-1">
          {/* Only icons shown when collapsed — tooltips would be added in full implementation */}
          <NavLink to="/dashboard" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Dasbor Utama">
            <Icon path={ICONS.dashboard} className="w-5 h-5" />
          </NavLink>
          <NavLink to="/statistik/sapb" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Kegiatan Statistik">
            <Icon path={ICONS.kegiatan} className="w-5 h-5" />
          </NavLink>
          <NavLink to="/se2026/persiapan" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Sensus Ekonomi">
            <Icon path={ICONS.sensus} className="w-5 h-5" />
          </NavLink>
          <NavLink to="/kelola-tugas" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Kelola Tugas Kegiatan">
            <Icon path={ICONS.tugas} className="w-5 h-5" />
          </NavLink>
          <NavLink to="/dokumen" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Manajemen Dokumen">
            <Icon path={ICONS.dokumen} className="w-5 h-5" />
          </NavLink>
          <NavLink to="/perjalanan" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Laporan Perjalanan Dinas">
            <Icon path={ICONS.perjalanan} className="w-5 h-5" />
          </NavLink>
          <NavLink to="/kalender" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Kalender & Agenda">
            <Icon path={ICONS.kalender} className="w-5 h-5" />
          </NavLink>
          <NavLink to="/tim" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Tim & Organisasi">
            <Icon path={ICONS.tim} className="w-5 h-5" />
          </NavLink>
          {isSuperadmin && (
            <>
              <NavLink to="/log" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Log Aktivitas">
                <Icon path={ICONS.log} className="w-5 h-5" />
              </NavLink>
              <NavLink to="/master/wilayah" className={({ isActive }) => `flex items-center justify-center p-2 rounded-xl transition-all ${isActive ? 'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'text-text-secondary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:bg-dark-navy/10'}`} title="Master Data">
                <Icon path={ICONS.master} className="w-5 h-5" />
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    );
  }

  // ── Expanded sidebar ──
  return (
    <aside className="flex flex-col h-full sidebar-w-expanded sidebar-transition overflow-hidden border-r border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface">

      {/* ── Logo / Brand ── */}
      <div className="flex items-center gap-3 h-14 px-4 border-b border-border-soft dark:border-dark-border-soft flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy to-accent-orange flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold text-text-primary dark:text-dark-text-primary leading-tight">SIMADU</p>
          <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary leading-tight truncate">BPS Kab. Batang Hari</p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto scrollbar-none py-3 px-2 space-y-0.5">

        {/* Dasbor */}
        <NavItem to="/dashboard" icon="dashboard" label="Dasbor Utama" />

        {/* ── Kegiatan Statistik ── */}
        <NavGroup icon="kegiatan" label="Kegiatan Statistik" activePrefixes={['/statistik', '/harga', '/ktip']}>

          {/* Statistik Distribusi */}
          <NavGroup label="Statistik Distribusi" indent={1} activePrefixes={['/statistik']}>
            <NavItem to="/statistik/sapb" label="SAPB" indent={2} />
          </NavGroup>

          {/* Statistik Harga */}
          <NavGroup label="Statistik Harga" indent={1} activePrefixes={['/harga']}>
            <NavFolder label="SHPed" indent={2} activePrefixes={['/harga/hd', '/harga/hkd']}>
              <NavItem to="/harga/hd"  label="HD"  indent={3} />
              <NavItem to="/harga/hkd" label="HKD" indent={3} />
            </NavFolder>
            <NavItem to="/harga/shp"           label="SHP"           indent={2} />
            <NavFolder label="SHPB" indent={2} activePrefixes={['/harga/shpb', '/harga/shpb-mingguan']}>
              <NavItem to="/harga/shpb"          label="SHPB Bulanan"  indent={3} />
              <NavItem to="/harga/shpb-mingguan" label="SHPB Mingguan" indent={3} />
            </NavFolder>
            <NavItem to="/harga/shkk"          label="SHKK"          indent={2} />
          </NavGroup>

          {/* KTIP */}
          <NavGroup label="KTIP" indent={1} activePrefixes={['/ktip']}>
            <NavItem to="/ktip/bumd" label="BUMD"    indent={2} />
            <NavItem to="/ktip/slk"  label="SLK-KSP" indent={2} />
            <NavItem to="/ktip/k3"   label="K3"      indent={2} />
            <NavItem to="/ktip/vhtl" label="VHTL"    indent={2} />
            <NavItem to="/ktip/vhts" label="VHTS"    indent={2} />
          </NavGroup>

        </NavGroup>

        {/* ── Sensus Ekonomi ── */}
        <NavGroup icon="sensus" label="Sensus Ekonomi" activePrefixes={['/se2026']}>
          <NavItem to="/se2026/persiapan"   label="Persiapan"              indent={1} />
          <NavItem to="/se2026/pelaksanaan" label="Pelaksanaan"            indent={1} />
          <NavItem to="/se2026/pengolahan"  label="Pengolahan & Diseminasi" indent={1} />
        </NavGroup>

        {/* ── Fitur Utama ── */}
        <NavItem to="/kelola-tugas" icon="tugas"    label="Kelola Tugas Kegiatan" />
        <NavItem to="/dokumen"      icon="dokumen"   label="Manajemen Dokumen" />
        <NavItem to="/perjalanan"   icon="perjalanan" label="Laporan Perjalanan Dinas" />
        <NavItem to="/kalender"     icon="kalender"  label="Kalender & Agenda" />
        <NavItem to="/tim"          icon="tim"       label="Tim & Organisasi" />

          {isSuperadmin && (
            <>
              <SectionLabel label="Administrasi" />
              <NavItem to="/log" icon="log" label="Log Aktivitas" />

              <NavGroup icon="master" label="Master Data" activePrefixes={['/master']}>
                <NavItem to="/master/wilayah"  label="Master Wilayah"  indent={1} />
                <NavItem to="/master/pegawai"  label="Master Pegawai"  indent={1} />
                <NavItem to="/master/mitra"    label="Master Mitra"    indent={1} />
                <NavItem to="/master/survei"   label="Master Survei"   indent={1} />
                <NavItem to="/master/kegiatan" label="Master Kegiatan" indent={1} />
              </NavGroup>
            </>
          )}

        </nav>

        {/* ── Footer Credit Notice ── */}
        <div className="p-4 border-t border-border-soft dark:border-dark-border-soft text-xs space-y-1 flex-shrink-0 bg-surface/50 dark:bg-dark-surface/50">
          <p className="font-heading font-bold text-text-primary dark:text-dark-text-primary text-xs">SIMADU</p>
          <p className="text-text-secondary dark:text-dark-text-secondary text-[11px] leading-tight">
            © 2026 Developed by <span className="font-semibold text-text-primary dark:text-dark-text-primary">Alief Raditia Ali</span>
          </p>
          <p className="text-[10px] text-text-secondary/70 dark:text-dark-text-secondary/70 leading-tight">
            Sistem Monitoring untuk Kegiatan Distribusi Terpadu - BPS Kabupaten Batang Hari
          </p>
        </div>
      </aside>
    );
  }
