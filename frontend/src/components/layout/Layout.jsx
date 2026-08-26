import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ErrorBoundary from '../ErrorBoundary';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useAuth } from '../../contexts/AuthContext';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-navy/20 border-t-navy dark:border-dark-navy/30 dark:border-t-dark-navy animate-spin" />
        <span className="text-xs text-text-secondary dark:text-dark-text-secondary font-medium">Memuat data...</span>
      </div>
    </div>
  );
}

/**
 * Layout — root wrapper for all authenticated pages.
 */
export default function Layout() {
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── Topbar (spans full width) ── */}
      <Topbar
        isDark={isDark}
        onToggleDark={toggleDark}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        sidebarCollapsed={sidebarCollapsed}
        user={user}
      />

      {/* ── Body: Sidebar + Main Content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          userRole={user?.role || 'admin'}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-bg-page dark:bg-dark-bg-page">
          {/* Error Boundary wraps only the page outlet — Sidebar/Topbar stay visible on error */}
          <ErrorBoundary>
            <div className="p-6">
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </ErrorBoundary>
        </main>

      </div>
    </div>
  );
}
