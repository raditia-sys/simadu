import { useState, useCallback, useEffect } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal, { FormField, Input } from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { api } from '../../lib/api';

const EMPTY_FORM = {
  nama: '',
  nip_atau_kode_mitra: '',
  kontak: '',
  jabatan: '',
  pangkat_golongan: '',
};

function PetugasPage({ tipe }) {
  const isMitra   = tipe === 'mitra';
  const title     = isMitra ? 'Master Mitra' : 'Master Pegawai';
  const subtitle  = isMitra
    ? 'Daftar petugas lapangan non-ASN (mitra statistik).'
    : 'Daftar pegawai ASN/staf tetap BPS.';

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
    const res = await api.get(`/master/petugas?tipe=${tipe}`);
    if (res.success) setData(res.data);
    setLoading(false);
  }, [tipe]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({
      ...EMPTY_FORM,
      jabatan: isMitra ? 'Mitra' : '',
    });
    setFormError('');
    setModal({ open: true, mode: 'add', row: null });
  }

  function openEdit(row) {
    setForm({
      nama:               row.nama,
      nip_atau_kode_mitra: row.nip_atau_kode_mitra ?? '',
      kontak:             row.kontak ?? '',
      jabatan:            row.jabatan ?? '',
      pangkat_golongan:   row.pangkat_golongan ?? '',
    });
    setFormError('');
    setModal({ open: true, mode: 'edit', row });
  }

  async function handleSave() {
    if (!form.nama.trim()) { setFormError('Nama wajib diisi.'); return; }
    setSaving(true);
    setFormError('');

    const payload = {
      nama:               form.nama.trim(),
      tipe,
      nip_atau_kode_mitra: form.nip_atau_kode_mitra.trim(),
      kontak:             form.kontak.trim(),
      jabatan:            form.jabatan.trim(),
      pangkat_golongan:   form.pangkat_golongan.trim(),
    };
    const res = modal.mode === 'add'
      ? await api.post('/master/petugas', payload)
      : await api.put(`/master/petugas/${modal.row.id}`, payload);

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
    const res = await api.delete(`/master/petugas/${confirm.row.id}`);
    setDeleting(false);
    setConfirm({ open: false, row: null });
    showToast(res.message);
    if (res.success) load();
  }

  const sf = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const columns = [
    { key: 'nama',              label: 'Nama' },
    { key: 'nip_atau_kode_mitra', label: isMitra ? 'Kode Mitra' : 'NIP', render: (r) => r.nip_atau_kode_mitra || '—' },
    { key: 'jabatan',           label: 'Jabatan', render: (r) => r.jabatan || '—' },
    { key: 'pangkat_golongan',  label: isMitra ? 'Status' : 'Pangkat/Gol.', render: (r) => r.pangkat_golongan || '—' },
    { key: 'kontak',            label: 'Kontak', render: (r) => r.kontak || '—' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">{subtitle}</p>
        </div>
        <button
          id={`btn-tambah-${tipe}`}
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah {isMitra ? 'Mitra' : 'Pegawai'}
        </button>
      </div>

      <div className="card p-5">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onEdit={openEdit}
          onDelete={(row) => setConfirm({ open: true, row })}
          searchKeys={['nama', 'nip_atau_kode_mitra', 'kontak', 'jabatan']}
          searchPlaceholder={`Cari ${isMitra ? 'mitra' : 'pegawai'}...`}
          emptyMessage={`Belum ada data ${isMitra ? 'mitra' : 'pegawai'}.`}
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
        title={`${modal.mode === 'add' ? 'Tambah' : 'Edit'} ${isMitra ? 'Mitra' : 'Pegawai'}`}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal({ ...modal, open: false })} className="btn-secondary text-sm px-4 py-2">Batal</button>
            <button id="btn-simpan-petugas" onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-sm text-accent-orange dark:text-dark-accent-orange">{formError}</p>}

          <FormField label="Nama Lengkap" required>
            <Input id="input-nama-petugas" value={form.nama} onChange={sf('nama')} placeholder="Nama lengkap" />
          </FormField>

          <FormField label={isMitra ? 'Kode Mitra' : 'NIP'} hint={isMitra ? 'Kode identifikasi mitra statistik' : '18 digit NIP ASN'}>
            <Input id="input-nip" value={form.nip_atau_kode_mitra} onChange={sf('nip_atau_kode_mitra')} placeholder={isMitra ? 'Kode mitra' : 'Nomor Induk Pegawai'} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Jabatan">
              <Input value={form.jabatan} onChange={sf('jabatan')} placeholder={isMitra ? 'Misal: Enumerator' : 'Misal: Statistisi Ahli Muda'} />
            </FormField>
            <FormField label={isMitra ? 'Status' : 'Pangkat / Golongan'}>
              <Input value={form.pangkat_golongan} onChange={sf('pangkat_golongan')} placeholder={isMitra ? 'Misal: Mitra Tetap' : 'Misal: III/b'} />
            </FormField>
          </div>

          <FormField label="Kontak" hint="No. HP atau email yang aktif.">
            <Input id="input-kontak" value={form.kontak} onChange={sf('kontak')} placeholder="Kontak (HP/email)" />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirm.open}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, row: null })}
        loading={deleting}
        message={`Hapus ${isMitra ? 'mitra' : 'pegawai'} "${confirm.row?.nama}"?`}
      />
    </div>
  );
}

// Export dua varian halaman berbasis komponen yang sama
export function MasterPegawaiPage() { return <PetugasPage tipe="pegawai" />; }
export function MasterMitraPage()   { return <PetugasPage tipe="mitra" />; }
