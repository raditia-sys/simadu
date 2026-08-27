import { useState, useEffect } from 'react';
import Modal, { FormField, Input } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import {
  isPushSupported,
  getNotificationPermission,
  checkIsSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  testPushNotification
} from '../../lib/pushNotification';

export default function ProfileModal({ open, onClose }) {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    nama: '',
    email: '',
    password: '',
  });

  const [saving, setSaving] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'info' });

  useEffect(() => {
    if (open && user) {
      setForm({
        nama: user.nama || '',
        email: user.email || '',
        password: '',
      });
      setFeedback({ text: '', type: 'info' });
      const supp = isPushSupported();
      setPushSupported(supp);
      if (supp) {
        checkIsSubscribed().then(setSubscribed);
      }
    }
  }, [open, user]);

  const showFeedback = (text, type = 'info') => {
    setFeedback({ text, type });
  };

  async function handleSaveProfile(e) {
    e?.preventDefault();
    setSaving(true);
    setFeedback({ text: '', type: 'info' });

    try {
      const res = await api.put('/auth/profile', {
        nama: form.nama,
        email: form.email,
        password: form.password || undefined,
      });

      if (res.success) {
        updateUser(res.data);
        showFeedback('Profil akun dan email berhasil diperbarui!', 'success');
        setForm(prev => ({ ...prev, password: '' }));
      } else {
        showFeedback(res.message || 'Gagal memperbarui profil.', 'error');
      }
    } catch (err) {
      showFeedback(err.message || 'Terjadi kesalahan saat menyimpan.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePush() {
    setTestingPush(true);
    setFeedback({ text: '', type: 'info' });
    try {
      if (subscribed) {
        await unsubscribeFromPush(api);
        setSubscribed(false);
        showFeedback('Notifikasi Web Push browser dinonaktifkan.', 'info');
      } else {
        await subscribeToPush(api);
        setSubscribed(true);
        showFeedback('Notifikasi Web Push browser berhasil diaktifkan!', 'success');
      }
    } catch (err) {
      showFeedback(err.message || 'Gagal mengubah status push notifikasi.', 'error');
    } finally {
      setTestingPush(false);
    }
  }

  async function handleTestPush() {
    setTestingPush(true);
    setFeedback({ text: '', type: 'info' });
    try {
      if (!subscribed) {
        await subscribeToPush(api);
        setSubscribed(true);
      }
      const res = await testPushNotification(api);
      if (res.success) {
        showFeedback('Notifikasi Web Push pengujian berhasil dikirim ke browser Anda!', 'success');
      } else {
        showFeedback(res.message || 'Gagal mengirim push notifikasi.', 'error');
      }
    } catch (err) {
      showFeedback(err.message || 'Gagal mengirim push notifikasi.', 'error');
    } finally {
      setTestingPush(false);
    }
  }

  async function handleTestEmail() {
    setTestingEmail(true);
    setFeedback({ text: '', type: 'info' });
    try {
      const res = await api.post('/notifications/test-email', {
        email: form.email || undefined
      });
      if (res.success) {
        showFeedback(res.message || 'Email uji coba berhasil dikirim! Silakan periksa kotak masuk/spam.', 'success');
      } else {
        showFeedback(res.message || 'Gagal mengirim email uji coba.', 'error');
      }
    } catch (err) {
      showFeedback(err.message || 'Gagal mengirim email uji coba.', 'error');
    } finally {
      setTestingEmail(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profil & Pengaturan Notifikasi Saya"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Feedback Alert */}
        {feedback.text && (
          <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'
              : feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
          }`}>
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Section 1: Profil & Email Form */}
        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-border-soft dark:border-dark-border-soft">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-dark-text-secondary">
              Informasi Akun
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy capitalize">
              Role: {user?.role || 'admin'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Username">
              <Input
                value={user?.username || ''}
                disabled
                className="opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-900"
              />
            </FormField>

            <FormField label="Nama Lengkap" required>
              <Input
                value={form.nama}
                onChange={e => setForm({ ...form, nama: e.target.value })}
                placeholder="Nama Lengkap"
                required
              />
            </FormField>
          </div>

          <FormField
            label="Alamat Email (Target Notifikasi Deadline)"
            hint="Email ini akan menerima rekap deadline harian BPS setiap pukul 08:00 WIB"
          >
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="contoh: nama.pegawai@bps.go.id"
            />
          </FormField>

          <FormField
            label="Password Baru (Opsional)"
            hint="Kosongkan jika tidak ingin mengganti password login"
          >
            <Input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Minimal 6 karakter"
            />
          </FormField>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
            </button>
          </div>
        </form>

        {/* Section 2: Uji Coba & Status Notifikasi */}
        <div className="pt-3 border-t border-border-soft dark:border-dark-border-soft space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-dark-text-secondary">
            Pusat Pengujian Notifikasi
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Box 1: Web Push Browser */}
            <div className="p-3 rounded-xl border border-border-soft dark:border-dark-border-soft bg-surface-card dark:bg-dark-surface-card flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary dark:text-dark-text-primary flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-accent-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    Web Push Browser
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    subscribed
                      ? 'bg-status-active/10 text-status-active dark:bg-dark-status-active/20 dark:text-dark-status-active border border-status-active/30'
                      : 'bg-navy/5 text-text-secondary dark:bg-dark-navy/10 dark:text-dark-text-secondary'
                  }`}>
                    {subscribed ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary mt-1">
                  Pop-up banner desktop/HP saat tugas mendekati deadline.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={testingPush || !pushSupported}
                  className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold btn-secondary transition-all"
                >
                  {subscribed ? 'Nonaktifkan Push' : 'Aktifkan Push'}
                </button>
                <button
                  type="button"
                  onClick={handleTestPush}
                  disabled={testingPush || !pushSupported}
                  className="w-full py-1 px-2 rounded-lg text-[11px] font-medium text-navy hover:underline dark:text-dark-navy"
                >
                  {testingPush ? 'Mengirim push...' : 'Uji Coba Push Sekarang'}
                </button>
              </div>
            </div>

            {/* Box 2: Email Notifikasi */}
            <div className="p-3 rounded-xl border border-border-soft dark:border-dark-border-soft bg-surface-card dark:bg-dark-surface-card flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary dark:text-dark-text-primary flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    Email Pengingat
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    form.email
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {form.email ? 'Terdaftar' : 'Belum Diatur'}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary mt-1 truncate" title={form.email || 'Email belum diatur'}>
                  {form.email ? `Tujuan: ${form.email}` : 'Masukkan email di atas & simpan.'}
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testingEmail || !form.email}
                  className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                  {testingEmail ? 'Mengirim Email...' : 'Uji Coba Kirim Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
