import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { isDark, toggle: toggleDark } = useDarkMode();

  useEffect(() => {
    document.title = 'SIMADU - Login';
  }, []);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  async function handleSubmit(e) {
    e.preventDefault();
    const form     = e.currentTarget;
    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');

    const { ok, message } = await login(username, password);

    setLoading(false);

    if (ok) {
      navigate(from, { replace: true }); // redirect ke halaman yang dituju sebelumnya
    } else {
      setError(message || 'Login gagal. Periksa kembali kredensial Anda.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page dark:bg-dark-bg-page p-4">

      {/* Dark mode toggle sudut kanan atas */}
      <button
        onClick={toggleDark}
        title={isDark ? 'Mode terang' : 'Mode gelap'}
        className="fixed top-4 right-4 p-2 rounded-xl text-text-secondary hover:text-text-primary
                   hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:text-dark-text-primary
                   dark:hover:bg-dark-navy/10 transition-all"
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

      <div className="card w-full max-w-[420px] p-8 space-y-7">

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy to-accent-orange flex items-center justify-center shadow-soft">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <h1 className="font-heading text-3xl font-bold text-text-primary dark:text-dark-text-primary tracking-tight">
            SIMADU
          </h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary leading-relaxed max-w-xs">
            Sistem Monitoring Untuk<br />Kegiatan Distribusi Terpadu
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Error message */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-accent-orange/10 dark:bg-dark-accent-orange/15 border border-accent-orange/20 dark:border-dark-accent-orange/25">
              <p className="text-sm text-accent-orange dark:text-dark-accent-orange">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-username" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary">
              Username / NIP
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Masukkan NIP atau username"
              required
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm
                bg-bg-page dark:bg-dark-bg-page
                border border-border-soft dark:border-dark-border-soft
                text-text-primary dark:text-dark-text-primary
                placeholder:text-text-secondary/60 dark:placeholder:text-dark-text-secondary/60
                focus:outline-none focus:ring-2 focus:ring-navy/40 dark:focus:ring-dark-navy/40
                disabled:opacity-60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary">
              Kata Sandi
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              required
              disabled={loading}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm
                bg-bg-page dark:bg-dark-bg-page
                border border-border-soft dark:border-dark-border-soft
                text-text-primary dark:text-dark-text-primary
                placeholder:text-text-secondary/60 dark:placeholder:text-dark-text-secondary/60
                focus:outline-none focus:ring-2 focus:ring-navy/40 dark:focus:ring-dark-navy/40
                disabled:opacity-60 transition-all"
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mt-2
              bg-accent-orange dark:bg-dark-accent-orange text-white text-sm font-semibold rounded-xl
              shadow-soft-sm transition-all duration-150 hover:brightness-105
              active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            )}
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {/* ── Footer Credit Notice ── */}
        <div className="pt-4 border-t border-border-soft dark:border-dark-border-soft text-center space-y-1">
          <p className="font-heading font-bold text-text-primary dark:text-dark-text-primary text-xs">SIMADU</p>
          <p className="text-text-secondary dark:text-dark-text-secondary text-[11px] leading-tight">
            © 2026 Developed by <span className="font-semibold text-text-primary dark:text-dark-text-primary">Alief Raditia Ali</span>
          </p>
          <p className="text-[10px] text-text-secondary/70 dark:text-dark-text-secondary/70 leading-tight">
            Sistem Monitoring untuk Kegiatan Distribusi Terpadu - BPS Kabupaten Batang Hari
          </p>
        </div>

      </div>
    </div>
  );
}
