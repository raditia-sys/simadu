import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute — redirect ke /login jika belum terautentikasi.
 * Menampilkan loading spinner saat cek sesi masih berlangsung.
 *
 * Props:
 * - children: konten yang diproteksi
 * - role: (optional) 'superadmin' → hanya superadmin yang boleh masuk
 */
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-page dark:bg-dark-bg-page">
        <div className="flex flex-col items-center gap-3">
          {/* Spinner */}
          <svg
            className="w-8 h-8 text-navy dark:text-dark-navy animate-spin"
            fill="none" viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Simpan rute yang dituju agar bisa redirect kembali setelah login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
