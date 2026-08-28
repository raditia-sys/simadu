import { useState, useCallback, useEffect } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal, { FormField, Input } from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../lib/api';

const EMPTY_FORM = { kecamatan: '', desa_kelurahan: '', rate_transport_lokal: '' };

export default function MasterWilayahPage() {
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
    const res = await api.get('/master/wilayah');
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
      kecamatan:           row.kecamatan,
      desa_kelurahan:      row.desa_kelurahan,
      rate_transport_lokal: row.rate_transport_lokal,
    });
    setFormError('');
    setModal({ open: true, mode: 'edit', row });
  }

  async function handleSave() {
    if (!form.kecamatan.trim() || !form.desa_kelurahan.trim()) {
      setFormError('Kecamatan dan Desa/Kelurahan wajib diisi.');
      return;
    }
    setSaving(true);
    setFormError('');

    const payload = {
      kecamatan:            form.kecamatan.trim(),
      desa_kelurahan:       form.desa_kelurahan.trim(),
      rate_transport_lokal: parseFloat(form.rate_transport_lokal) || 0,
    };

    const res = modal.mode === 'add'
      ? await api.post('/master/wilayah', payload)
      : await api.put(`/master/wilayah/${modal.row.id}`, payload);

    setSaving(false);
    if (res.success) {
      setModal({ open: false, mode: 'add', row: null });
      showToast(res.message);
      load();
    } else {
      setFormError(res.message || 'Gagal menyimpan data.');
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await api.delete(`/master/wilayah/${confirm.row.id}`);
    setDeleting(false);
    if (res.success) {
      setConfirm({ open: false, row: null });
      showToast(res.message);
      load();
    } else {
      setConfirm({ open: false, row: null });
      showToast(res.message || 'Gagal menghapus data.');
    }
  }

  const columns = [
    { key: 'kecamatan',      label: 'Kecamatan' },
    { key: 'desa_kelurahan', label: 'Desa / Kelurahan' },
    {
      key: 'rate_transport_lokal',
      label: 'Tarif Transport Lokal',
      render: (row) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
          .format(row.rate_transport_lokal),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">
            Master Wilayah
          </h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            Daftar desa/kelurahan dengan tarif transport lokal untuk kalkulasi perjalanan dinas.
          </p>
        </div>
        <button
          id="btn-tambah-wilayah"
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah Wilayah
        </button>
      </div>

      {/* Table */}
      <div className="card p-5">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onEdit={openEdit}
          onDelete={(row) => setConfirm({ open: true, row })}
          searchKeys={['kecamatan', 'desa_kelurahan']}
          searchPlaceholder="Cari kecamatan atau desa..."
          emptyMessage="Belum ada data wilayah."
        />
      </div>

      {/* Modal Tambah/Edit */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.mode === 'add' ? 'Tambah Wilayah' : 'Edit Wilayah'}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setModal({ ...modal, open: false })}
              className="btn-secondary text-sm px-4 py-2"
            >
              Batal
            </button>
            <button
              id="btn-simpan-wilayah"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-accent-orange dark:text-dark-accent-orange">{formError}</p>
          )}
          <FormField label="Kecamatan" required>
            <Input
              id="input-kecamatan"
              value={form.kecamatan}
              onChange={(e) => setForm({ ...form, kecamatan: e.target.value })}
              placeholder="Nama kecamatan"
            />
          </FormField>
          <FormField label="Desa / Kelurahan" required>
            <Input
              id="input-desa"
              value={form.desa_kelurahan}
              onChange={(e) => setForm({ ...form, desa_kelurahan: e.target.value })}
              placeholder="Nama desa atau kelurahan"
            />
          </FormField>
          <FormField label="Tarif Transport Lokal (Rp)" hint="Nominal dalam Rupiah, dipakai untuk kalkulasi perjalanan dinas.">
            <Input
              id="input-rate"
              type="number"
              min="0"
              value={form.rate_transport_lokal}
              onChange={(e) => setForm({ ...form, rate_transport_lokal: e.target.value })}
              placeholder="0"
            />
          </FormField>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirm.open}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, row: null })}
        loading={deleting}
        message={`Hapus wilayah "${confirm.row?.desa_kelurahan}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
