import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import {
  isPushSupported,
  getNotificationPermission,
  checkIsSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  testPushNotification
} from '../../lib/pushNotification';

export default function NotificationBell() {
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
              {subscribed
                ? 'Browser ini terdaftar untuk menerima pengingat saat tugas mendekati deadline (H-5, H-3, Hari H).'
                : 'Izinkan browser mengirimkan notifikasi agar Anda tidak melewatkan batas waktu tugas.'}
            </p>

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
              {loading ? 'Memproses...' : subscribed ? 'Nonaktifkan Notifikasi' : 'Aktifkan di Browser Ini'}
            </button>

            {subscribed && (
              <button
                onClick={handleTestNotification}
                disabled={loading}
                className="w-full py-1.5 px-3 rounded-xl text-[11px] font-medium text-text-secondary hover:text-text-primary hover:bg-navy/5 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10 transition-colors flex items-center justify-center gap-1.5"
              >
                Uji Coba Notifikasi Sekarang
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
