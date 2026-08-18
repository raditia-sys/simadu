import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <p className="font-heading text-7xl font-bold text-navy/20 dark:text-dark-navy/20 select-none">
        404
      </p>
      <div>
        <h1 className="font-heading text-xl font-semibold text-text-primary dark:text-dark-text-primary">
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
          URL yang Anda akses tidak terdaftar dalam sistem.
        </p>
      </div>
      <Link to="/dashboard" className="btn-primary">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
        </svg>
        Kembali ke Dasbor
      </Link>
    </div>
  );
}
