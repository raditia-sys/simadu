import { useState, useCallback, useEffect } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal, { FormField, Input, Select, Textarea } from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { api } from '../../lib/api';

const KATEGORI_OPTIONS = ['Distribusi', 'Harga', 'KTIP', 'Sensus'];
const PERIODE_OPTIONS  = ['mingguan', 'bulanan', 'triwulanan', 'tahunan'];

const BADGE_COLORS = {
  Distribusi:  'bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy',
  Harga:       'bg-accent-orange/10 text-accent-orange dark:bg-dark-accent-orange/20 dark:text-dark-accent-orange',
  KTIP:        'bg-status-active/10 text-status-active dark:bg-dark-status-active/20 dark:text-dark-status-active',
  Sensus:      'bg-status-neutral/10 text-status-neutral dark:bg-dark-status-neutral/20 dark:text-dark-status-neutral',
};

const EMPTY_FORM = { nama_survei: '', kategori: 'Distribusi', jenis_periode: 'bulanan', tautan_entri_data: '', materi_dokumen: '' };

export default function MasterSurveiPage() {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const [modal, setModal]         = useState({ open: false, mode: 'add', row: null });
  const [confirm, setConfirm]     = useState({ open: false, row: null });
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/master/survei');
    if (res.success) setData(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal({ open: true, mode: 'add', row: null });
  }

  function openEdit(row) {
    setForm({
      nama_survei:       row.nama_survei,
      kategori:          row.kategori,
      jenis_periode:     row.jenis_periode,
      tautan_entri_data: row.tautan_entri_data ?? '',
      materi_dokumen:    row.materi_dokumen ?? '',
    });
    setFormError('');
    setModal({ open: true, mode: 'edit', row });
  }

  async function handleSave() {
    if (!form.nama_survei.trim()) { setFormError('Nama survei wajib diisi.'); return; }
    setSaving(true);
    setFormError('');
    const payload = { ...form, nama_survei: form.nama_survei.trim() };
    const res = modal.mode === 'add'
      ? await api.post('/master/survei', payload)
      : await api.put(`/master/survei/${modal.row.id}`, payload);
    setSaving(false);
    if (res.success) {
      setModal({ open: false, mode: 'add', row: null });
      showToast(res.message);
      load();
    } else {
      setFormError(res.message || 'Gagal menyimpan.');
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await api.delete(`/master/survei/${confirm.row.id}`);
    setDeleting(false);
    setConfirm({ open: false, row: null });
    showToast(res.message);
    if (res.success) load();
  }

  const columns = [
    { key: 'nama_survei', label: 'Nama Survei' },
    {
      key: 'kategori', label: 'Kategori',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[row.kategori] ?? ''}`}>
          {row.kategori}
        </span>
      ),
    },
    {
      key: 'jenis_periode', label: 'Periode',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-neutral/10 text-status-neutral dark:bg-dark-status-neutral/20 dark:text-dark-status-neutral capitalize">
          {row.jenis_periode}
        </span>
      ),
    },
    {
      key: 'tautan_entri_data', label: 'Tautan Entri',
      render: (row) => row.tautan_entri_data ? (
        <a href={row.tautan_entri_data} target="_blank" rel="noreferrer"
           className="text-navy dark:text-dark-navy text-xs underline underline-offset-2 hover:opacity-70">
          Buka ↗
        </a>
      ) : '—',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">Master Survei</h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            Daftar survei & kegiatan statistik dengan metadata periode dan tautan entri data.
          </p>
        </div>
        <button id="btn-tambah-survei" onClick={openAdd} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah Survei
        </button>
      </div>

      <div className="card p-5">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onEdit={openEdit}
          onDelete={(row) => setConfirm({ open: true, row })}
          searchKeys={['nama_survei', 'kategori']}
          searchPlaceholder="Cari nama atau kategori survei..."
          emptyMessage="Belum ada data survei."
        />
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl bg-status-active text-white text-sm shadow-soft-lg">
          {toast}
        </div>
      )}

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.mode === 'add' ? 'Tambah Survei' : 'Edit Survei'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal({ ...modal, open: false })} className="btn-secondary text-sm px-4 py-2">Batal</button>
            <button id="btn-simpan-survei" onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-sm text-accent-orange dark:text-dark-accent-orange">{formError}</p>}
          <FormField label="Nama Survei" required>
            <Input id="input-nama-survei" value={form.nama_survei} onChange={(e) => setForm({ ...form, nama_survei: e.target.value })} placeholder="Nama lengkap survei" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Kategori" required>
              <Select id="input-kategori" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}>
                {KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}
              </Select>
            </FormField>
            <FormField label="Jenis Periode" required hint="Menentukan field periode wajib di tugas.">
              <Select id="input-periode" value={form.jenis_periode} onChange={(e) => setForm({ ...form, jenis_periode: e.target.value })}>
                {PERIODE_OPTIONS.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Tautan Entri Data" hint="URL ke sistem entri data eksternal (akan dibuka di tab baru).">
            <Input id="input-tautan" type="url" value={form.tautan_entri_data} onChange={(e) => setForm({ ...form, tautan_entri_data: e.target.value })} placeholder="https://..." />
          </FormField>
          <FormField label="Materi / Dokumen" hint="Deskripsi singkat materi survei atau link dokumen terkait.">
            <Textarea id="input-materi" value={form.materi_dokumen} onChange={(e) => setForm({ ...form, materi_dokumen: e.target.value })} placeholder="Deskripsi materi survei..." />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirm.open}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, row: null })}
        loading={deleting}
        message={`Hapus survei "${confirm.row?.nama_survei}"?`}
      />
    </div>
  );
}
