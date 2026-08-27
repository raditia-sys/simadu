import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  isPushSupported,
  getNotificationPermission,
  checkIsSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  testPushNotification
} from '../../lib/pushNotification';

export default function NotificationBell() {
  const { user }                      = useAuth();
  const [supported, setSupported]     = useState(false);
  const [permission, setPermission]   = useState('default');
  const [subscribed, setSubscribed]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const [msg, setMsg]                 = useState({ text: '', type: 'info' });
  const popoverRef                    = useRef(null);

  useEffect(() => {
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (isSupp) {
      setPermission(getNotificationPermission());
      checkIsSubscribed().then(setSubscribed);
    }
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleToggleSubscribe() {
    setLoading(true);
    setMsg({ text: '', type: 'info' });
    try {
      if (subscribed) {
        await unsubscribeFromPush(api);
        setSubscribed(false);
        setMsg({ text: 'Notifikasi browser dinonaktifkan.', type: 'info' });
      } else {
        await subscribeToPush(api);
        setSubscribed(true);
        setPermission(getNotificationPermission());
        setMsg({ text: 'Notifikasi browser berhasil diaktifkan!', type: 'success' });
      }
    } catch (err) {
      setMsg({ text: err.message || 'Gagal mengubah pengaturan notifikasi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleTestNotification() {
    setLoading(true);
    setMsg({ text: '', type: 'info' });
    try {
      if (!subscribed) {
        await subscribeToPush(api);
        setSubscribed(true);
      }
      const res = await testPushNotification(api);
      if (res.success) {
        setMsg({ text: 'Notifikasi uji coba berhasil dikirim!', type: 'success' });
      } else {
        setMsg({ text: res.message || 'Gagal mengirim notifikasi.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: err.message || 'Terjadi kesalahan.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleTestEmail() {
    setLoading(true);
    setMsg({ text: '', type: 'info' });
    try {
      const res = await api.post('/notifications/test-email', {});
      if (res.success) {
        setMsg({ text: res.message || 'Email uji coba berhasil dikirim!', type: 'success' });
      } else {
        setMsg({ text: res.message || 'Gagal mengirim email uji coba.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: err.message || 'Gagal mengirim email.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        title={subscribed ? 'Notifikasi Browser Aktif' : 'Aktifkan Notifikasi Browser'}
        aria-label="Pengaturan Notifikasi"
        className={`p-1.5 rounded-lg relative transition-all ${
          subscribed
            ? 'text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50'
            : 'text-text-secondary hover:text-text-primary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {subscribed && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface dark:bg-dark-surface shadow-soft-lg border border-border-soft dark:border-dark-border-soft p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border-soft dark:border-dark-border-soft">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                subscribed
                  ? 'bg-status-active/10 text-status-active dark:bg-dark-status-active/20 dark:text-dark-status-active'
                  : 'bg-navy/8 text-text-secondary dark:bg-dark-navy/15 dark:text-dark-text-secondary'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary dark:text-dark-text-primary leading-tight">
                  Notifikasi Browser
                </p>
                <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary leading-tight">
                  Pengingat deadline tugas statistik
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              subscribed
                ? 'bg-status-active/10 text-status-active dark:bg-dark-status-active/20 dark:text-dark-status-active border border-status-active/30'
                : 'bg-navy/5 text-text-secondary dark:bg-dark-navy/10 dark:text-dark-text-secondary'
            }`}>
              {subscribed ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>

          <div className="py-3 space-y-2.5">
            <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary leading-relaxed">
              Pengingat otomatis akan dikirim ke browser dan email Anda saat tugas kegiatan statistik mendekati batas waktu.
            </p>

            {/* Email Info Card */}
            <div className="p-2.5 rounded-xl bg-surface-card dark:bg-dark-surface-card border border-border-soft dark:border-dark-border-soft flex items-center justify-between text-[11px]">
              <span className="text-text-secondary dark:text-dark-text-secondary flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                Email:
              </span>
              <span className="font-semibold text-text-primary dark:text-dark-text-primary truncate max-w-[150px]" title={user?.email || 'Belum diatur'}>
                {user?.email || 'Belum diatur'}
              </span>
            </div>

            {msg.text && (
              <div className={`p-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 ${
                msg.type === 'error'
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'
                  : 'bg-status-active/10 text-status-active dark:bg-dark-status-active/20 dark:text-dark-status-active border border-status-active/30'
              }`}>
                <span>{msg.text}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border-soft dark:border-dark-border-soft flex flex-col gap-2">
            <button
              onClick={handleToggleSubscribe}
              disabled={loading}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                subscribed
                  ? 'btn-secondary'
                  : 'btn-primary'
              }`}
            >
              {loading ? 'Memproses...' : subscribed ? 'Nonaktifkan Push Browser' : 'Aktifkan Push di Browser Ini'}
            </button>

            {subscribed && (
              <button
                onClick={handleTestNotification}
                disabled={loading}
                className="w-full py-1 px-3 rounded-xl text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10 transition-colors flex items-center justify-center gap-1.5"
              >
                Uji Coba Push Notifikasi
              </button>
            )}

            <button
              onClick={handleTestEmail}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
              {loading ? 'Mengirim...' : 'Uji Coba Kirim Email'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
