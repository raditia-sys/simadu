import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';

// Loading fallback untuk login / initial
function AuthLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-page dark:bg-dark-bg-page">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-navy/20 border-t-navy dark:border-dark-navy/30 dark:border-t-dark-navy animate-spin" />
        <span className="text-xs text-text-secondary dark:text-dark-text-secondary font-medium">Memuat SIMADU...</span>
      </div>
    </div>
  );
}

// Lazy-loaded Pages (Code Splitting)
const LoginPage            = lazy(() => import('./pages/LoginPage'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const NotFound             = lazy(() => import('./pages/NotFound'));
const TugasKegiatanPage    = lazy(() => import('./pages/TugasKegiatanPage'));
const SurveiPage           = lazy(() => import('./pages/SurveiPage'));
const ManajemenDokumenPage = lazy(() => import('./pages/ManajemenDokumenPage'));
const KalenderPage         = lazy(() => import('./pages/KalenderPage'));
const TimPage              = lazy(() => import('./pages/TimPage'));
const LogAktivitasPage     = lazy(() => import('./pages/LogAktivitasPage'));
const LaporanPerjalananPage = lazy(() => import('./pages/LaporanPerjalananPage'));

// Master Data (Lazy)
const MasterWilayahPage    = lazy(() => import('./pages/master/MasterWilayahPage'));
const MasterSurveiPage     = lazy(() => import('./pages/master/MasterSurveiPage'));
const MasterKegiatanPage   = lazy(() => import('./pages/master/MasterKegiatanPage'));
const MasterUsersPage      = lazy(() => import('./pages/master/MasterUsersPage'));
const MasterPegawaiPage    = lazy(() => import('./pages/master/MasterPetugasPage').then((m) => ({ default: m.MasterPegawaiPage })));
const MasterMitraPage      = lazy(() => import('./pages/master/MasterPetugasPage').then((m) => ({ default: m.MasterMitraPage })));

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<AuthLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // ── Dashboard ────────────────────────────────────────────────────────
      { path: 'dashboard', element: <ErrorBoundary><DashboardPage /></ErrorBoundary> },

      // ── Master Data (superadmin only) ────────────────────────────────────
      {
        path: 'master',
        element: <ProtectedRoute role="superadmin"><ErrorBoundary><Navigate to="/master/wilayah" replace /></ErrorBoundary></ProtectedRoute>,
      },
      {
        path: 'master/wilayah',
        element: <ProtectedRoute role="superadmin"><ErrorBoundary><MasterWilayahPage /></ErrorBoundary></ProtectedRoute>,
      },
      {
        path: 'master/pegawai',
        element: <ProtectedRoute role="superadmin"><ErrorBoundary><MasterPegawaiPage /></ErrorBoundary></ProtectedRoute>,
      },
      {
        path: 'master/mitra',
        element: <ProtectedRoute role="superadmin"><ErrorBoundary><MasterMitraPage /></ErrorBoundary></ProtectedRoute>,
      },
      {
        path: 'master/survei',
        element: <ProtectedRoute role="superadmin"><ErrorBoundary><MasterSurveiPage /></ErrorBoundary></ProtectedRoute>,
      },
      {
        path: 'master/kegiatan',
        element: <ProtectedRoute role="superadmin"><ErrorBoundary><MasterKegiatanPage /></ErrorBoundary></ProtectedRoute>,
      },
      {
        path: 'master/users',
        element: <ProtectedRoute role="superadmin"><ErrorBoundary><MasterUsersPage /></ErrorBoundary></ProtectedRoute>,
      },

      // ── Statistik Distribusi ──────────────────────────────────────
      { path: 'statistik/sapb', element: <ErrorBoundary><SurveiPage surveiNama="Survei Angkutan Penumpang dan Barang" kodeSurvei="SAPB" kategori="Distribusi" /></ErrorBoundary> },

      // ── Statistik Harga ─────────────────────────────────────────────
      { path: 'harga/hd',            element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Perdesaan"   kodeSurvei="HD" kategori="Harga" /></ErrorBoundary> },
      { path: 'harga/hkd',           element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Konsumen Perdesaan"  kodeSurvei="HKD" kategori="Harga" /></ErrorBoundary> },
      { path: 'harga/shp',           element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Produsen"  kodeSurvei="SHP" kategori="Harga" /></ErrorBoundary> },
      { path: 'harga/shpb',          element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Perdagangan Besar (Bulanan)" kodeSurvei="SHPB" kategori="Harga" /></ErrorBoundary> },
      { path: 'harga/shpb-mingguan', element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Perdagangan Besar (Mingguan)" kodeSurvei="SHPB" kategori="Harga" /></ErrorBoundary> },
      { path: 'harga/shkk',          element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Kemahalan Konstruksi" kodeSurvei="SHKK" kategori="Harga" /></ErrorBoundary> },

      // ── KTIP ────────────────────────────────────────────────────────
      { path: 'ktip/bumd', element: <ErrorBoundary><SurveiPage surveiNama="Survei Keuangan Badan Usaha Milik Daerah" kodeSurvei="BUMD"    kategori="KTIP" /></ErrorBoundary> },
      { path: 'ktip/slk',  element: <ErrorBoundary><SurveiPage surveiNama="Survei Lembaga Keuangan - Koperasi Simpan Pinjam" kodeSurvei="SLK-KSP" kategori="KTIP" /></ErrorBoundary> },
      { path: 'ktip/k3',   element: <ErrorBoundary><SurveiPage surveiNama="Survei Statistik Keuangan Pemerintah Desa" kodeSurvei="K3"      kategori="KTIP" /></ErrorBoundary> },
      { path: 'ktip/vhtl', element: <ErrorBoundary><SurveiPage surveiNama="Survei Hotel dan Jasa Akomodasi Lainnya Tahunan" kodeSurvei="VHTL"    kategori="KTIP" /></ErrorBoundary> },
      { path: 'ktip/vhts', element: <ErrorBoundary><SurveiPage surveiNama="Survei Tingkat Penghunian Kamar Hotel" kodeSurvei="VHTS"    kategori="KTIP" /></ErrorBoundary> },

      // ── Sensus Ekonomi 2026 ────────────────────────────────────────────
      { path: 'se2026/persiapan',   element: <ErrorBoundary><SurveiPage surveiNama="Persiapan Sensus Ekonomi"              kategori="Sensus" /></ErrorBoundary> },
      { path: 'se2026/pelaksanaan', element: <ErrorBoundary><SurveiPage surveiNama="Pelaksanaan Sensus Ekonomi"            kategori="Sensus" /></ErrorBoundary> },
      { path: 'se2026/pengolahan',  element: <ErrorBoundary><SurveiPage surveiNama="Pengolahan dan Diseminasi Sensus Ekonomi" kategori="Sensus" /></ErrorBoundary> },

      // ── Kelola Tugas Kegiatan (semua auth, RBAC di dalam page) ──────────
      { path: 'kelola-tugas', element: <ProtectedRoute><ErrorBoundary><TugasKegiatanPage /></ErrorBoundary></ProtectedRoute> },

      // ── Fitur Lain ────────────────────────────────────────────────────────
      { path: 'dokumen',    element: <ErrorBoundary><ManajemenDokumenPage /></ErrorBoundary> },
      { path: 'kalender',   element: <ErrorBoundary><KalenderPage /></ErrorBoundary> },
      { path: 'tim',        element: <ErrorBoundary><TimPage /></ErrorBoundary> },
      { path: 'perjalanan', element: <ErrorBoundary><LaporanPerjalananPage /></ErrorBoundary> },
      { path: 'log',        element: <ProtectedRoute role="superadmin"><ErrorBoundary><LogAktivitasPage /></ErrorBoundary></ProtectedRoute> },

      // 404 dalam layout
      { path: '*', element: <NotFound /> },
    ],
  },
], {
  basename: window.location.pathname.startsWith('/simadu') ? '/simadu' : '/',
});

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
