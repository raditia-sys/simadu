import { useState, useCallback, useEffect } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal, { FormField, Input } from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';

const EMPTY_FORM = { nama: '' };

export default function MasterKegiatanPage() {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const [modal, setModal]         = useState({ open: false, mode: 'add', row: null });
  const [confirm, setConfirm]     = useState({ open: false, row: null });
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/master/kegiatan');
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
    setForm({ nama: row.nama });
    setFormError('');
    setModal({ open: true, mode: 'edit', row });
  }

  async function handleSave() {
    if (!form.nama.trim()) { setFormError('Nama peran wajib diisi.'); return; }
    setSaving(true);
    setFormError('');
    const res = modal.mode === 'add'
      ? await api.post('/master/kegiatan', { nama: form.nama.trim() })
      : await api.put(`/master/kegiatan/${modal.row.id}`, { nama: form.nama.trim() });
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
    const res = await api.delete(`/master/kegiatan/${confirm.row.id}`);
    setDeleting(false);
    setConfirm({ open: false, row: null });
    showToast(res.message);
    if (res.success) load();
  }

  const columns = [
    { key: 'id',   label: 'ID',   className: 'w-16 text-text-secondary dark:text-dark-text-secondary' },
    { key: 'nama', label: 'Nama Peran Petugas' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">Master Kegiatan</h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            Jenis peran petugas dalam survei (Pemeriksaan, Pendataan, Listing, dll.).
          </p>
        </div>
        <button id="btn-tambah-kegiatan" onClick={openAdd} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah Peran
        </button>
      </div>

      <div className="card p-5">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onEdit={openEdit}
          onDelete={(row) => setConfirm({ open: true, row })}
          searchKeys={['nama']}
          searchPlaceholder="Cari nama peran..."
          emptyMessage="Belum ada data peran."
        />
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.mode === 'add' ? 'Tambah Peran' : 'Edit Peran'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal({ ...modal, open: false })} className="btn-secondary text-sm px-4 py-2">Batal</button>
            <button id="btn-simpan-kegiatan" onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-sm text-accent-orange dark:text-dark-accent-orange">{formError}</p>}
          <FormField label="Nama Peran" required hint='Contoh: "Petugas Pemeriksaan Lapangan"'>
            <Input id="input-nama-kegiatan" value={form.nama} onChange={(e) => setForm({ nama: e.target.value })} placeholder="Nama peran petugas" autoFocus />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirm.open}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, row: null })}
        loading={deleting}
        message={`Hapus peran "${confirm.row?.nama}"?`}
      />
    </div>
  );
}
