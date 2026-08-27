import { useState } from 'react';
import Modal, { FormField, Input } from '../ui/Modal';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ChangeMyPasswordModal({ open, onClose }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    password: '',
    confirm_password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccess('');

    if (!form.password || form.password.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Konfirmasi password tidak cocok.');
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
        setSuccess('Password akun Anda berhasil diperbarui!');
        setForm({ password: '', confirm_password: '' });
        setTimeout(() => {
          onClose();
          setSuccess('');
        }, 1500);
      } else {
        setError(res.message || 'Gagal mengubah password.');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ganti Password Akun Saya"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs">
            {success}
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-soft dark:border-dark-border-soft text-xs space-y-1">
          <p className="font-semibold text-text-primary dark:text-dark-text-primary">
            {user?.nama || 'Pengguna'}
          </p>
          <p className="text-text-secondary dark:text-dark-text-secondary">
            Username: <span className="font-mono text-navy dark:text-dark-navy">{user?.username}</span>
          </p>
        </div>

        <FormField label="Password Baru" required>
          <Input
            type="password"
            placeholder="Minimal 6 karakter"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </FormField>

        <FormField label="Konfirmasi Password Baru" required>
          <Input
            type="password"
            placeholder="Ketik ulang password baru"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            required
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2 border-t border-border-soft dark:border-dark-border-soft">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs"
          >
            {saving ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
