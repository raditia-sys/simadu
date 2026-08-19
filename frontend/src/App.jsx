import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';

// Pages
import LoginPage       from './pages/LoginPage';
import DashboardPage   from './pages/DashboardPage';
import NotFound        from './pages/NotFound';
import TugasKegiatanPage from './pages/TugasKegiatanPage';

// Master Data
import MasterWilayahPage  from './pages/master/MasterWilayahPage';
import MasterSurveiPage   from './pages/master/MasterSurveiPage';
import MasterKegiatanPage from './pages/master/MasterKegiatanPage';
import { MasterPegawaiPage, MasterMitraPage } from './pages/master/MasterPetugasPage';
import SurveiPage           from './pages/SurveiPage';
import ManajemenDokumenPage from './pages/ManajemenDokumenPage';
import KalenderPage         from './pages/KalenderPage';
import TimPage              from './pages/TimPage';
import LogAktivitasPage     from './pages/LogAktivitasPage';
import LaporanPerjalananPage from './pages/LaporanPerjalananPage';

// Placeholder — halaman ini akan dibangun di tahap berikutnya
function Placeholder({ title }) {
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">{title}</h1>
      <div className="card p-8 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-navy/8 dark:bg-dark-navy/15 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-navy/40 dark:text-dark-navy/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.65-4.65 1.358-1.358a3.75 3.75 0 1 1 5.303 5.304l-1.358 1.357" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Halaman ini sedang dalam pengembangan.</p>
        </div>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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

      // ── Statistik Distribusi ──────────────────────────────────────
      { path: 'statistik/sapb', element: <ErrorBoundary><SurveiPage surveiNama="Survei Angkutan Penumpang dan Barang" kategori="Distribusi" /></ErrorBoundary> },

      // ── Statistik Harga ─────────────────────────────────────────────
      { path: 'harga/hd',   element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Perdesaan"   kategori="Harga" /></ErrorBoundary> },
      { path: 'harga/hkd',  element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Konsumen Perdesaan"  kategori="Harga" /></ErrorBoundary> },
      { path: 'harga/shp',  element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Produsen"  kategori="Harga" /></ErrorBoundary> },
      { path: 'harga/shpb', element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Perdagangan Besar" kategori="Harga" /></ErrorBoundary> },
      { path: 'harga/shkk', element: <ErrorBoundary><SurveiPage surveiNama="Survei Harga Kemahalan Konstruksi" kategori="Harga" /></ErrorBoundary> },

      // ── KTIP ────────────────────────────────────────────────────────
      { path: 'ktip/bumd', element: <ErrorBoundary><SurveiPage surveiNama="Survei Keuangan Badan Usaha Milik Daerah"    kategori="KTIP" /></ErrorBoundary> },
      { path: 'ktip/slk',  element: <ErrorBoundary><SurveiPage surveiNama="Survei Lembaga Keuangan - Koperasi Simpan Pinjam" kategori="KTIP" /></ErrorBoundary> },
      { path: 'ktip/k3',   element: <ErrorBoundary><SurveiPage surveiNama="Survei Keuangan Konstruksi"      kategori="KTIP" /></ErrorBoundary> },
      { path: 'ktip/vhtl', element: <ErrorBoundary><SurveiPage surveiNama="Survei Hotel dan Jasa Akomodasi Lainnya Tahunan"    kategori="KTIP" /></ErrorBoundary> },
      { path: 'ktip/vhts', element: <ErrorBoundary><SurveiPage surveiNama="Survei Tingkat Penghunian Kamar Hotel"    kategori="KTIP" /></ErrorBoundary> },

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
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
