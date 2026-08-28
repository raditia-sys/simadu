import { useState, useCallback, useEffect } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal, { FormField, Input, Select } from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { isPushSupported, subscribeToPush, testPushNotification } from '../../lib/pushNotification';

const EMPTY_FORM = {
  petugas_id: '',
  nama: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: 'admin',
};

export default function MasterUsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [data, setData]                       = useState([]);
  const [availablePegawai, setAvailablePegawai] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [deleting, setDeleting]               = useState(false);

  // Modals state
  const [modal, setModal]             = useState({ open: false, mode: 'add', row: null });
  const [passModal, setPassModal]     = useState({ open: false, row: null });
  const [confirm, setConfirm]         = useState({ open: false, row: null });

  // Forms state
  const [form, setForm]               = useState(EMPTY_FORM);
  const [passForm, setPassForm]       = useState({ new_password: '', confirm_password: '' });
  const [showPass, setShowPass]       = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [formError, setFormError]     = useState('');
  const [testingPush, setTestingPush] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [checkingDeadlines, setCheckingDeadlines] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const toggleShowPassword = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text, label = 'Password') => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} disalin ke clipboard!`);
    }).catch(() => {
      showToast(`${label}: ${text}`);
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [resUsers, resPegawai] = await Promise.all([
      api.get('/users'),
      api.get('/users/available-pegawai')
    ]);

    if (resUsers.success) setData(resUsers.data || []);
    if (resPegawai.success) setAvailablePegawai(resPegawai.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistik ringkas
  const totalUsers       = data.length;
  const totalSuperadmin  = data.filter(u => u.role === 'superadmin').length;
  const totalAdmin       = data.filter(u => u.role === 'admin').length;
  const unlinkedPegawai  = availablePegawai.length;

  // Open Add Modal
  async function openAdd() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowPass(false);
    setModal({ open: true, mode: 'add', row: null });
    const resPegawai = await api.get('/users/available-pegawai');
    if (resPegawai.success) {
      setAvailablePegawai(resPegawai.data || []);
    }
  }

  // Pegawai selection handler
  function handleSelectPegawai(petugasIdStr) {
    if (!petugasIdStr) {
      setForm(prev => ({ ...prev, petugas_id: '', nama: '', email: '' }));
      return;
    }
    const pId = Number(petugasIdStr);
    const selected = availablePegawai.find(p => p.id === pId);
    if (selected) {
      const suggestedUsername = selected.nama
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .trim()
        .split(/\s+/)[0] || '';

      setForm(prev => ({
        ...prev,
        petugas_id: selected.id,
        nama: selected.nama,
        email: selected.email || prev.email || '',
        username: prev.username ? prev.username : suggestedUsername,
      }));
    }
  }

  // Open Edit Modal
  async function openEdit(row) {
    setForm({
      petugas_id: row.petugas_id || '',
      nama: row.nama || '',
      username: row.username || '',
      email: row.email || '',
      role: row.role || 'admin',
      password: '',
      password_confirmation: '',
    });
    setFormError('');
    setModal({ open: true, mode: 'edit', row });

    const resPegawai = await api.get('/users/available-pegawai?user_id=' + row.id);
    if (resPegawai.success) {
      setAvailablePegawai(resPegawai.data || []);
    }
  }

  // Open Change Password Modal
  function openChangePassword(row) {
    setPassForm({ new_password: '', confirm_password: '' });
    setFormError('');
    setShowNewPass(false);
    setPassModal({ open: true, row });
  }

  // Save Add/Edit
  async function handleSave() {
    setFormError('');

    if (modal.mode === 'add') {
      if (!form.username.trim()) { setFormError('Username wajib diisi.'); return; }
      if (!form.password) { setFormError('Password wajib diisi.'); return; }
      if (form.password.length < 6) { setFormError('Password minimal 6 karakter.'); return; }
      if (form.password !== form.password_confirmation) {
        setFormError('Konfirmasi password tidak cocok.');
        return;
      }
    } else {
      if (!form.username.trim()) { setFormError('Username wajib diisi.'); return; }
    }

    setSaving(true);
    const payload = {
      petugas_id: form.petugas_id ? Number(form.petugas_id) : null,
      nama: form.nama.trim(),
      username: form.username.trim().toLowerCase(),
      email: form.email.trim(),
      role: form.role,
    };

    if (modal.mode === 'add') {
      payload.password = form.password;
    }

    const res = modal.mode === 'add'
      ? await api.post('/users', payload)
      : await api.put(`/users/${modal.row.id}`, payload);

    setSaving(false);
    if (res.success) {
      setModal({ open: false, mode: 'add', row: null });
      showToast(res.message || 'Akun admin berhasil disimpan.');
      loadData();
    } else {
      setFormError(res.message || 'Gagal menyimpan akun.');
    }
  }

  // Save Password Change
  async function handleChangePasswordSubmit() {
    setFormError('');
    if (!passForm.new_password) {
      setFormError('Password baru wajib diisi.');
      return;
    }
    if (passForm.new_password.length < 6) {
      setFormError('Password minimal 6 karakter.');
      return;
    }
    if (passForm.new_password !== passForm.confirm_password) {
      setFormError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setSaving(true);
    const res = await api.put(`/users/${passModal.row.id}/password`, {
      new_password: passForm.new_password,
    });
    setSaving(false);

    if (res.success) {
      setPassModal({ open: false, row: null });
      showToast(res.message || 'Password berhasil diperbarui.');
    } else {
      setFormError(res.message || 'Gagal mengubah password.');
    }
  }

  // Delete User
  async function handleDelete() {
    if (!confirm.row) return;
    setDeleting(true);
    const res = await api.delete(`/users/${confirm.row.id}`);
    setDeleting(false);
    setConfirm({ open: false, row: null });

    if (res.success) {
      showToast(res.message || 'Akun admin berhasil dihapus.');
      loadData();
    } else {
      showToast(res.message || 'Gagal menghapus akun.');
    }
  }

  // Test Push Notification
  async function handleTestPush() {
    setTestingPush(true);
    try {
      if (isPushSupported()) {
        await subscribeToPush(api);
      }
      const res = await testPushNotification(api);
      if (res.success) {
        showToast('Notifikasi Web Push berhasil dikirim ke browser Anda!');
      } else {
        showToast(res.message || 'Gagal mengirim notifikasi.');
      }
    } catch (err) {
      showToast(err.message || 'Gagal mengirim notifikasi uji coba.');
    } finally {
      setTestingPush(false);
    }
  }

  // State uji coba email per baris
  const [sendingEmailId, setSendingEmailId] = useState(null);

  // Kirim Email Uji Coba ke akun spesifik
  async function handleSendRowTestEmail(row) {
    if (!row.email) {
      showToast(`Akun ${row.nama} belum memiliki alamat email.`);
      return;
    }
    setSendingEmailId(row.id);
    try {
      const res = await api.post('/notifications/test-email', {
        user_id: row.id,
        email: row.email,
      });
      if (res.success) {
        showToast(res.message || `Email uji coba berhasil dikirim ke ${row.email}!`);
      } else {
        showToast(res.message || 'Gagal mengirim email uji coba.');
      }
    } catch (err) {
      showToast(err.message || 'Gagal mengirim email.');
    } finally {
      setSendingEmailId(null);
    }
  }

  // Trigger Deadline Check Manually
  async function handleCheckDeadlines() {
    setCheckingDeadlines(true);
    try {
      const res = await api.post('/notifications/check-deadlines', {});
      if (res.success) {
        showToast(res.message || 'Pengecekan deadline selesai.');
      } else {
        showToast(res.message || 'Gagal mengecek deadline.');
      }
    } catch (err) {
      showToast(err.message || 'Gagal mengecek deadline.');
    } finally {
      setCheckingDeadlines(false);
    }
  }

  // Table Columns
  const columns = [
    {
      key: 'nama',
      label: 'Nama & Pegawai Terkait',
      render: (row) => (
        <div>
          <div className="font-medium text-text-primary dark:text-dark-text-primary flex items-center gap-1.5">
            {row.nama || row.username}
            {row.petugas_id ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                Organik Pegawai
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-dark-bg-page dark:text-dark-text-secondary border border-border-soft dark:border-dark-border-soft">
                Akun Sistem
              </span>
            )}
          </div>
          {row.nama_pegawai && (
            <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
              NIP: {row.nip || '-'} {row.jabatan ? `• ${row.jabatan}` : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'username',
      label: 'Username',
      render: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-navy/5 dark:bg-dark-navy/15 text-navy dark:text-dark-navy border border-border-soft dark:border-dark-border-soft">
          @{row.username}
        </span>
      ),
    },
    {
      key: 'plain_password',
      label: 'Password',
      render: (row) => {
        const isVisible = !!visiblePasswords[row.id];
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="px-2 py-1 rounded bg-bg-page dark:bg-dark-bg-page border border-border-soft dark:border-dark-border-soft text-text-primary dark:text-dark-text-primary select-all">
              {isVisible ? (row.plain_password || '-') : '••••••••'}
            </span>
            {row.plain_password && (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => toggleShowPassword(row.id)}
                  title={isVisible ? 'Sembunyikan password' : 'Lihat password'}
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-navy/5 dark:hover:bg-dark-navy/10 transition-colors"
                >
                  {isVisible ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(row.plain_password, 'Password')}
                  title="Salin password"
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-navy/5 dark:hover:bg-dark-navy/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'email',
      label: 'Email Target Notifikasi',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-dark-text-secondary">
          <svg className="w-3.5 h-3.5 opacity-60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          {row.email ? (
            <span className="font-mono text-text-primary dark:text-dark-text-primary">{row.email}</span>
          ) : (
            <span className="italic opacity-60">Belum diatur</span>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role Akses',
      render: (row) => {
        const isSuper = row.role === 'superadmin';
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isSuper
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
          }`}>
            {isSuper ? 'Superadmin' : 'Admin'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      render: (row) => {
        const isSelf = currentUser && currentUser.id === row.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* Kirim Email Uji Coba */}
            <button
              onClick={() => handleSendRowTestEmail(row)}
              disabled={sendingEmailId === row.id || !row.email}
              title={row.email ? `Kirim Email Uji Coba ke ${row.email} (${row.nama})` : 'Akun belum memiliki email'}
              className={`p-1.5 rounded-lg transition-colors ${
                !row.email
                  ? 'text-text-secondary/30 dark:text-dark-text-secondary/30 cursor-not-allowed'
                  : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
              }`}
            >
              {sendingEmailId === row.id ? (
                <svg className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              )}
            </button>

            {/* Ganti Password */}
            <button
              onClick={() => openChangePassword(row)}
              title="Ganti Password"
              className="p-1.5 rounded-lg text-accent-orange hover:bg-accent-orange/10 dark:text-dark-accent-orange dark:hover:bg-dark-accent-orange/15 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
              </svg>
            </button>

            {/* Edit */}
            <button
              onClick={() => openEdit(row)}
              title="Edit Akun & Email"
              className="p-1.5 rounded-lg text-navy hover:bg-navy/10 dark:text-dark-navy dark:hover:bg-dark-navy/15 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </button>

            {/* Delete */}
            <button
              onClick={() => setConfirm({ open: true, row })}
              disabled={isSelf}
              title={isSelf ? 'Tidak dapat menghapus akun yang sedang aktif digunakan' : 'Hapus Akun'}
              className={`p-1.5 rounded-lg transition-colors ${
                isSelf
                  ? 'text-text-secondary/30 dark:text-dark-text-secondary/30 cursor-not-allowed'
                  : 'text-accent-orange hover:bg-accent-orange/10 dark:text-dark-accent-orange dark:hover:bg-dark-accent-orange/15'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary flex items-center gap-2.5">
            <svg className="w-6 h-6 text-navy dark:text-dark-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            Master Akun Admin
          </h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            Kelola akun login admin, kredensial pengguna, serta integrasi email & notifikasi web push.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Cek Deadline Tugas */}
          <button
            onClick={handleCheckDeadlines}
            disabled={checkingDeadlines}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Periksa tugas H-3, H-1, Hari H dan kirim notifikasi rekap email ke seluruh admin"
          >
            <svg className={`w-3.5 h-3.5 text-navy dark:text-dark-navy ${checkingDeadlines ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {checkingDeadlines ? 'Memeriksa...' : 'Cek Deadline & Rekap Email'}
          </button>

          {/* Tambah Akun Baru */}
          <button
            onClick={openAdd}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Akun Admin
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-navy/10 dark:bg-dark-navy/20 flex items-center justify-center text-navy dark:text-dark-navy flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <div>
            <div className="font-heading text-2xl font-bold text-text-primary dark:text-dark-text-primary leading-none">{totalUsers}</div>
            <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">Total Akun Terdaftar</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div>
            <div className="font-heading text-2xl font-bold text-text-primary dark:text-dark-text-primary leading-none">{totalSuperadmin}</div>
            <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">Super Administrator</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div>
            <div className="font-heading text-2xl font-bold text-text-primary dark:text-dark-text-primary leading-none">{totalAdmin}</div>
            <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">Administrator</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.765Z" />
            </svg>
          </div>
          <div>
            <div className="font-heading text-2xl font-bold text-text-primary dark:text-dark-text-primary leading-none">{unlinkedPegawai}</div>
            <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">Pegawai Belum Punya Akun</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card p-5">
        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          loading={loading}
          searchKeys={['nama', 'username', 'email', 'nama_pegawai', 'nip', 'role']}
          searchPlaceholder="Cari nama, NIP, username, atau email..."
          emptyMessage="Belum ada data akun admin."
          defaultPerPage={10}
          perPageOptions={[10, 50, 100, 'all']}
        />
      </div>

      {/* Modal Tambah / Edit Akun */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.mode === 'add' ? 'Tambah Akun Admin Baru' : 'Edit Data Akun Admin'}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setModal({ ...modal, open: false })}
              className="btn-secondary text-sm px-4 py-2"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Akun'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-accent-orange dark:text-dark-accent-orange font-medium">{formError}</p>
          )}

          {/* Opsi Pilih Pegawai Organik */}
          <FormField label="Tautkan dengan Pegawai Organik (Opsional)" hint="Memilih pegawai akan menghubungkan akun dengan data NIP dan identitas resmi pegawai.">
            <Select
              value={form.petugas_id}
              onChange={(e) => handleSelectPegawai(e.target.value)}
            >
              <option value="">-- Bukan Pegawai / Akun Bebas --</option>
              {availablePegawai.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.nip ? `NIP: ${p.nip}` : 'Pegawai'}) {p.email ? `- ${p.email}` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Nama Lengkap / Tampilan" required>
            <Input
              type="text"
              placeholder="Contoh: Alief Raditia Ali"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Username (Login)" required>
              <Input
                type="text"
                placeholder="Contoh: alief"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </FormField>

            <FormField label="Role Akses" required>
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="admin">Administrator</option>
                <option value="superadmin">Super Administrator</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Email Penerima Notifikasi (Pengingat Deadline)" hint="Email ini digunakan untuk menerima pengingat deadline tugas statistik. Dapat diubah kapan saja.">
            <Input
              type="email"
              placeholder="Contoh: raditia.ali@bps.go.id atau email@gmail.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>

          {/* Form Password hanya saat Tambah Baru */}
          {modal.mode === 'add' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-soft dark:border-dark-border-soft">
              <FormField label="Password" required>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary"
                  >
                    {showPass ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
              </FormField>

              <FormField label="Konfirmasi Password" required>
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  value={form.password_confirmation}
                  onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                />
              </FormField>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Ganti Password */}
      <Modal
        isOpen={passModal.open}
        onClose={() => setPassModal({ ...passModal, open: false })}
        title={`Ganti Password: ${passModal.row?.nama || passModal.row?.username || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPassModal({ ...passModal, open: false })}
              className="btn-secondary text-sm px-4 py-2"
            >
              Batal
            </button>
            <button
              onClick={handleChangePasswordSubmit}
              disabled={saving}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-60"
            >
              {saving ? 'Mengubah...' : 'Ubah Password'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-accent-orange dark:text-dark-accent-orange font-medium">{formError}</p>
          )}

          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            Anda sedang mengatur ulang kata sandi untuk akun <span className="font-semibold text-text-primary dark:text-dark-text-primary">@{passModal.row?.username}</span> ({passModal.row?.nama}).
          </p>

          <FormField label="Password Baru" required>
            <div className="relative">
              <Input
                type={showNewPass ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={passForm.new_password}
                onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary"
              >
                {showNewPass ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
          </FormField>

          <FormField label="Konfirmasi Password Baru" required>
            <Input
              type={showNewPass ? 'text' : 'password'}
              placeholder="Ulangi password baru"
              value={passForm.confirm_password}
              onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })}
            />
          </FormField>
        </div>
      </Modal>

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={confirm.open}
        title="Hapus Akun Admin"
        message={`Apakah Anda yakin ingin menghapus akun @${confirm.row?.username} (${confirm.row?.nama})? Pengguna ini tidak akan dapat login lagi ke sistem SIMADU.`}
        confirmLabel="Hapus Akun"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, row: null })}
      />
    </div>
  );
}
