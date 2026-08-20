import { useState, useCallback, useEffect } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal, { FormField, Input, Select, Textarea } from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { api } from '../../lib/api';

const KATEGORI_OPTIONS = ['Distribusi', 'Harga', 'KTIP', 'Sensus'];
const PERIODE_OPTIONS  = ['mingguan', 'bulanan', 'triwulanan', 'tahunan'];
const BULAN_OPTIONS    = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const BADGE_COLORS = {
  Distribusi:  'bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy',
  Harga:       'bg-accent-orange/10 text-accent-orange dark:bg-dark-accent-orange/20 dark:text-dark-accent-orange',
  KTIP:        'bg-status-active/10 text-status-active dark:bg-dark-status-active/20 dark:text-dark-status-active',
  Sensus:      'bg-status-neutral/10 text-status-neutral dark:bg-dark-status-neutral/20 dark:text-dark-status-neutral',
};

const EMPTY_FORM = {
  nama_survei: '', kode_survei: '', kategori: 'Distribusi', jenis_periode: 'bulanan',
  deadline_hari: '', tautan_entri_data: '', materi_dokumen: '',
  bulan_mulai: '', bulan_selesai: '',
  tanggal_mulai_koleksi: '', tanggal_selesai_koleksi: '',
  tanggal_mulai_mg2: '', tanggal_selesai_mg2: '',
};

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
    setForm(EMPTY_FORM); setFormError('');
    setModal({ open: true, mode: 'add', row: null });
  }

  function openEdit(row) {
    setForm({
      nama_survei:             row.nama_survei,
      kode_survei:             row.kode_survei ?? '',
      kategori:                row.kategori,
      jenis_periode:           row.jenis_periode,
      deadline_hari:           row.deadline_hari ?? '',
      tautan_entri_data:       row.tautan_entri_data ?? '',
      materi_dokumen:          row.materi_dokumen ?? '',
      bulan_mulai:             row.bulan_mulai ?? '',
      bulan_selesai:           row.bulan_selesai ?? '',
      tanggal_mulai_koleksi:   row.tanggal_mulai_koleksi ?? '',
      tanggal_selesai_koleksi: row.tanggal_selesai_koleksi ?? '',
      tanggal_mulai_mg2:       row.tanggal_mulai_mg2 ?? '',
      tanggal_selesai_mg2:     row.tanggal_selesai_mg2 ?? '',
    });
    setFormError('');
    setModal({ open: true, mode: 'edit', row });
  }

  async function handleSave() {
    if (!form.nama_survei.trim()) { setFormError('Nama survei wajib diisi.'); return; }
    if (form.deadline_hari !== '' && (parseInt(form.deadline_hari) < 1 || parseInt(form.deadline_hari) > 31)) {
      setFormError('Deadline hari harus antara 1-31.'); return;
    }
    if (form.jenis_periode === 'tahunan') {
      const bm = form.bulan_mulai !== '' ? parseInt(form.bulan_mulai) : null;
      const bs = form.bulan_selesai !== '' ? parseInt(form.bulan_selesai) : null;
      if ((bm === null) !== (bs === null)) { setFormError('Bulan mulai dan bulan selesai harus diisi bersama-sama.'); return; }
      if (bm !== null && bs !== null && bm > bs) { setFormError('Bulan mulai tidak boleh lebih dari bulan selesai.'); return; }
    }
    setSaving(true); setFormError('');
    const payload = {
      ...form,
      nama_survei:             form.nama_survei.trim(),
      kode_survei:             form.kode_survei.trim() || null,
      deadline_hari:           form.deadline_hari !== '' ? parseInt(form.deadline_hari) : null,
      bulan_mulai:             form.bulan_mulai !== '' ? parseInt(form.bulan_mulai) : null,
      bulan_selesai:           form.bulan_selesai !== '' ? parseInt(form.bulan_selesai) : null,
      tanggal_mulai_koleksi:   form.tanggal_mulai_koleksi !== '' ? parseInt(form.tanggal_mulai_koleksi) : null,
      tanggal_selesai_koleksi: form.tanggal_selesai_koleksi !== '' ? parseInt(form.tanggal_selesai_koleksi) : null,
      tanggal_mulai_mg2:       form.tanggal_mulai_mg2 !== '' ? parseInt(form.tanggal_mulai_mg2) : null,
      tanggal_selesai_mg2:     form.tanggal_selesai_mg2 !== '' ? parseInt(form.tanggal_selesai_mg2) : null,
    };
    const res = modal.mode === 'add'
      ? await api.post('/master/survei', payload)
      : await api.put(`/master/survei/${modal.row.id}`, payload);
    setSaving(false);
    if (res.success) { setModal({ open: false, mode: 'add', row: null }); showToast(res.message); load(); }
    else setFormError(res.message || 'Gagal menyimpan.');
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await api.delete(`/master/survei/${confirm.row.id}`);
    setDeleting(false); setConfirm({ open: false, row: null });
    showToast(res.message); if (res.success) load();
  }

  const columns = [
    { key: 'kode_survei', label: 'Kode',
      render: (row) => row.kode_survei
        ? <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy">{row.kode_survei}</span>
        : <span className="text-text-secondary dark:text-dark-text-secondary text-xs">—</span> },
    { key: 'nama_survei', label: 'Nama Survei' },
    { key: 'kategori', label: 'Kategori',
      render: (row) => <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[row.kategori] ?? ''}`}>{row.kategori}</span> },
    { key: 'jenis_periode', label: 'Periode',
      render: (row) => {
        const label = row.jenis_periode === 'tahunan' && row.bulan_mulai && row.bulan_selesai
          ? `Tahunan (${BULAN_OPTIONS[row.bulan_mulai]}–${BULAN_OPTIONS[row.bulan_selesai]})`
          : row.jenis_periode.charAt(0).toUpperCase() + row.jenis_periode.slice(1);
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-neutral/10 text-status-neutral dark:bg-dark-status-neutral/20 dark:text-dark-status-neutral">{label}</span>;
      }},
    { key: 'tanggal_mulai_koleksi', label: 'Tgl Koleksi',
      render: (row) => row.tanggal_mulai_koleksi && row.tanggal_selesai_koleksi
        ? <span className="text-xs font-mono">tgl {row.tanggal_mulai_koleksi}–{row.tanggal_selesai_koleksi}</span>
        : <span className="text-text-secondary dark:text-dark-text-secondary text-xs">—</span> },
    { key: 'deadline_hari', label: 'Deadline Entri',
      render: (row) => row.deadline_hari
        ? <span className="text-xs font-mono text-accent-orange dark:text-dark-accent-orange font-semibold">Tgl {row.deadline_hari}</span>
        : <span className="text-text-secondary dark:text-dark-text-secondary text-xs">-</span> },
    { key: 'tautan_entri_data', label: 'Tautan Entri',
      render: (row) => row.tautan_entri_data
        ? <a href={row.tautan_entri_data} target="_blank" rel="noreferrer" className="text-navy dark:text-dark-navy text-xs underline underline-offset-2 hover:opacity-70">Buka</a>
        : '-' },
  ];

  const f = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">Master Survei</h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">Daftar survei dan kegiatan statistik dengan metadata periode dan tautan entri data.</p>
        </div>
        <button id="btn-tambah-survei" onClick={openAdd} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Tambah Survei
        </button>
      </div>
      <div className="card p-5">
        <DataTable columns={columns} data={data} loading={loading} onEdit={openEdit}
          onDelete={(row) => setConfirm({ open: true, row })}
          searchKeys={['nama_survei', 'kategori', 'kode_survei']} searchPlaceholder="Cari nama, kode, atau kategori survei..."
          emptyMessage="Belum ada data survei." />
      </div>
      {toast && <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl bg-status-active text-white text-sm shadow-soft-lg">{toast}</div>}
      <Modal isOpen={modal.open} onClose={() => setModal({ ...modal, open: false })}
        title={modal.mode === 'add' ? 'Tambah Survei' : 'Edit Survei'} size="lg"
        footer={<div className="flex justify-end gap-2">
          <button onClick={() => setModal({ ...modal, open: false })} className="btn-secondary text-sm px-4 py-2">Batal</button>
          <button id="btn-simpan-survei" onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>}>
        <div className="space-y-4">
          {formError && <p className="text-sm text-accent-orange dark:text-dark-accent-orange">{formError}</p>}

          {/* Nama & Kode */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <FormField label="Nama Survei" required>
                <Input id="input-nama-survei" value={form.nama_survei} onChange={(e) => f('nama_survei', e.target.value)} placeholder="Nama lengkap survei" />
              </FormField>
            </div>
            <FormField label="Kode Survei" hint="Singkatan, misal: SAPB, HD">
              <Input id="input-kode-survei" value={form.kode_survei} onChange={(e) => f('kode_survei', e.target.value)} placeholder="Contoh: SAPB" />
            </FormField>
          </div>

          {/* Kategori & Periode */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Kategori" required>
              <Select id="input-kategori" value={form.kategori} onChange={(e) => f('kategori', e.target.value)}>
                {KATEGORI_OPTIONS.map(k => <option key={k}>{k}</option>)}
              </Select>
            </FormField>
            <FormField label="Jenis Periode" required hint="Menentukan field periode wajib di tugas.">
              <Select id="input-periode" value={form.jenis_periode} onChange={(e) => f('jenis_periode', e.target.value)}>
                {PERIODE_OPTIONS.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </Select>
            </FormField>
          </div>

          {/* Rentang bulan — hanya tampil untuk tahunan */}
          {form.jenis_periode === 'tahunan' && (
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-navy/5 dark:bg-dark-navy/5 border border-border-soft dark:border-dark-border-soft">
              <FormField label="Bulan Mulai Pelaksanaan" hint="Bulan pertama survei dilaksanakan">
                <Select id="input-bulan-mulai" value={form.bulan_mulai} onChange={(e) => f('bulan_mulai', e.target.value)}>
                  <option value="">— Tidak ditentukan —</option>
                  {BULAN_OPTIONS.slice(1).map((b, i) => <option key={i+1} value={i+1}>{b}</option>)}
                </Select>
              </FormField>
              <FormField label="Bulan Selesai Pelaksanaan" hint="Bulan terakhir survei dilaksanakan">
                <Select id="input-bulan-selesai" value={form.bulan_selesai} onChange={(e) => f('bulan_selesai', e.target.value)}>
                  <option value="">— Tidak ditentukan —</option>
                  {BULAN_OPTIONS.slice(1).map((b, i) => <option key={i+1} value={i+1}>{b}</option>)}
                </Select>
              </FormField>
            </div>
          )}

          {/* Rentang tanggal koleksi */}
          <div className="space-y-2">
            <div className={`grid grid-cols-2 gap-4 p-3 rounded-xl border ${form.jenis_periode === 'mingguan' ? 'bg-accent-orange/5 border-accent-orange/20 dark:border-dark-accent-orange/20' : 'bg-navy/5 dark:bg-dark-navy/5 border-border-soft dark:border-dark-border-soft'}`}>
              <div className="col-span-2 text-xs font-medium text-text-secondary dark:text-dark-text-secondary -mb-1">
                {form.jenis_periode === 'mingguan' ? '📅 Minggu 1 — Tanggal Pengumpulan' : '📅 Tanggal Pengumpulan Data'}
              </div>
              <FormField label="Tanggal Mulai" hint="Tanggal pertama dalam periode">
                <Input id="input-tgl-mulai" type="number" min="1" max="31"
                  value={form.tanggal_mulai_koleksi} onChange={(e) => f('tanggal_mulai_koleksi', e.target.value)} placeholder="Contoh: 1" />
              </FormField>
              <FormField label="Tanggal Selesai" hint="Tanggal terakhir dalam periode">
                <Input id="input-tgl-selesai" type="number" min="1" max="31"
                  value={form.tanggal_selesai_koleksi} onChange={(e) => f('tanggal_selesai_koleksi', e.target.value)} placeholder="Contoh: 10" />
              </FormField>
            </div>

            {/* Minggu 2 — hanya tampil untuk jenis_periode = mingguan */}
            {form.jenis_periode === 'mingguan' && (
              <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-accent-orange/5 border border-accent-orange/20 dark:border-dark-accent-orange/20">
                <div className="col-span-2 text-xs font-medium text-text-secondary dark:text-dark-text-secondary -mb-1">
                  📅 Minggu 2 — Tanggal Pengumpulan
                </div>
                <FormField label="Tanggal Mulai" hint="Tanggal pertama minggu ke-2">
                  <Input id="input-tgl-mulai-mg2" type="number" min="1" max="31"
                    value={form.tanggal_mulai_mg2} onChange={(e) => f('tanggal_mulai_mg2', e.target.value)} placeholder="Contoh: 11" />
                </FormField>
                <FormField label="Tanggal Selesai" hint="Tanggal terakhir minggu ke-2">
                  <Input id="input-tgl-selesai-mg2" type="number" min="1" max="31"
                    value={form.tanggal_selesai_mg2} onChange={(e) => f('tanggal_selesai_mg2', e.target.value)} placeholder="Contoh: 20" />
                </FormField>
              </div>
            )}
          </div>

          <FormField label="Deadline Entri Data (Hari ke-)" hint="Misal: 15 = deadline setiap tanggal 15 per periode. Kosongkan jika tidak ada deadline rutin.">
            <Input id="input-deadline-hari" type="number" min="1" max="31"
              value={form.deadline_hari} onChange={(e) => f('deadline_hari', e.target.value)} placeholder="Contoh: 15" />
          </FormField>
          <FormField label="Tautan Entri Data" hint="URL ke sistem entri data eksternal.">
            <Input id="input-tautan" type="url" value={form.tautan_entri_data} onChange={(e) => f('tautan_entri_data', e.target.value)} placeholder="https://..." />
          </FormField>
          <FormField label="Materi / Dokumen" hint="Deskripsi singkat materi survei.">
            <Textarea id="input-materi" value={form.materi_dokumen} onChange={(e) => f('materi_dokumen', e.target.value)} placeholder="Deskripsi materi survei..." />
          </FormField>
        </div>
      </Modal>
      <ConfirmDialog isOpen={confirm.open} onConfirm={handleDelete} onCancel={() => setConfirm({ open: false, row: null })}
        loading={deleting} message={`Hapus survei "${confirm.row?.nama_survei}"?`} />
    </div>
  );
}