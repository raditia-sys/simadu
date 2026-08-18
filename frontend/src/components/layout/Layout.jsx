import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ErrorBoundary from '../ErrorBoundary';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Layout — root wrapper for all authenticated pages.
 *
 * Structure:
 * ┌─────────────────────────────────────────────┐
 * │ Topbar (fixed height: 56px)                 │
 * ├───────────┬─────────────────────────────────┤
 * │           │                                 │
 * │  Sidebar  │   <Outlet /> (page content)     │
 * │  (fixed   │   wrapped in ErrorBoundary      │
 * │   width)  │                                 │
 * └───────────┴─────────────────────────────────┘
 *
 * Note: Mobile sidebar overlays the content area (not yet fully implemented —
 * foundation is here, full mobile drawer will be added in UI polish phase).
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
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>

      </div>
    </div>
  );
}
