import { useState } from 'react';
import Modal, { FormField, Input } from '../ui/Modal';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function ChangeMyPasswordModal({ open, onClose }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    if (!form.password || form.password.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/auth/profile', {
        nama: user?.nama,
        email: user?.email,
        password: form.password,
      });

      if (res.success) {
        showToast('Password akun Anda berhasil diperbarui!', 'success', 'BERHASIL');
        setForm({ password: '', confirm_password: '' });
        onClose();
      } else {
        setError(res.message || 'Gagal mengubah password.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({ password: '', confirm_password: '' });
    setError('');
    setShowPassword(false);
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Ganti Password Akun Saya"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Ringkasan Akun Pengguna */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-soft dark:border-dark-border-soft text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="font-bold text-text-primary dark:text-dark-text-primary text-sm">
              {user?.nama || 'Pengguna'}
            </p>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy capitalize">
              {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
            </span>
          </div>
          <p className="text-text-secondary dark:text-dark-text-secondary">
            Username: <span className="font-mono font-semibold text-text-primary dark:text-dark-text-primary">{user?.username}</span>
          </p>
          {user?.email && (
            <p className="text-text-secondary dark:text-dark-text-secondary truncate">
              Email: <span className="text-navy dark:text-dark-navy">{user?.email}</span>
            </p>
          )}
        </div>

        {/* Form Password Baru */}
        <FormField label="Password Baru" required hint="Gunakan minimal 6 karakter kombinasi huruf & angka.">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Masukkan password baru..."
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary p-1"
              title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
        </FormField>

        {/* Konfirmasi Password */}
        <FormField label="Konfirmasi Password Baru" required>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Ketik ulang password baru..."
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            required
            autoComplete="new-password"
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-3 border-t border-border-soft dark:border-dark-border-soft">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary text-xs px-4 py-2"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs px-4 py-2 disabled:opacity-60 flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              'Simpan Password'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
