import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import WizardStepBar from '../components/perjalanan/WizardStepBar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n) {
  if (!n && n !== 0) return '—';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
function diffDays(a, b) {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}
const STATUS_BADGE = {
  draft:    'bg-accent-orange/10 text-accent-orange dark:bg-dark-accent-orange/15 dark:text-dark-accent-orange',
  selesai:  'bg-navy/10 text-navy dark:bg-dark-navy/15 dark:text-dark-navy',
};
const inputCls = 'w-full text-sm px-3.5 py-2.5 rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 dark:focus:ring-dark-navy/20 transition-all';
const labelCls = 'block text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1';

// ─── Step 1: Data Perjalanan Dinas ───────────────────────────────────────────
function Step1({ laporan, petugas, wilayah, surveys, kegiatanList = [], onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState(() => laporan ? {
    petugas_id:          String(laporan.petugas_id ?? ''),
    nomor_surat:         laporan.nomor_surat ?? '',
    tanggal_surat_tugas: laporan.tanggal_surat_tugas ?? today,
    tujuan_wilayah_id:   String(laporan.tujuan_wilayah_id ?? ''),
    survei_id:           laporan.survei_id ? String(laporan.survei_id) : '',
    tanggal_tugas:       laporan.tanggal_tugas ?? laporan.tanggal_berangkat ?? today,
    maksud_perjalanan:   laporan.maksud_perjalanan ?? '',
    biaya_transport:     laporan.biaya_transport ? String(laporan.biaya_transport) : '',
  } : {
    petugas_id: '', nomor_surat: '', tanggal_surat_tugas: today,
    tujuan_wilayah_id: '', survei_id: '',
    tanggal_tugas: today,
    maksud_perjalanan: '', biaya_transport: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const sf = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Auto-fill biaya dari rate wilayah
  useEffect(() => {
    const w = wilayah.find(x => String(x.id) === form.tujuan_wilayah_id);
    if (w?.rate_transport_lokal && !form.biaya_transport) {
      setForm(f => ({ ...f, biaya_transport: String(w.rate_transport_lokal) }));
    }
  }, [form.tujuan_wilayah_id]);

  async function save() {
    if (!form.petugas_id || !form.tujuan_wilayah_id || !form.survei_id || !form.tanggal_tugas || !form.maksud_perjalanan.trim()) {
      setError('Lengkapi semua field bertanda *'); return;
    }
    setSaving(true); setError('');
    const payload = {
      ...form,
      tanggal_berangkat: form.tanggal_tugas,
      tanggal_kembali: form.tanggal_tugas,
      survei_id: form.survei_id ? Number(form.survei_id) : null,
      biaya_transport: form.biaya_transport || 0,
    };
    const res = laporan
      ? await api.put(`/perjalanan/${laporan.id}`, payload)
      : await api.post('/perjalanan', payload);
    setSaving(false);
    if (res.success) onSaved(res.data);
    else setError(res.message);
  }

  const selCls = inputCls;

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-accent-orange dark:text-dark-accent-orange bg-accent-orange/5 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Petugas *</label>
          <select value={form.petugas_id} onChange={sf('petugas_id')} className={selCls}>
            <option value="">— Pilih petugas —</option>
            {petugas.map(p => <option key={p.id} value={p.id}>{p.nama} {p.jabatan ? `(${p.jabatan})` : `(${p.tipe})`}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Nomor Surat Tugas</label>
          <input value={form.nomor_surat} onChange={sf('nomor_surat')} className={inputCls}
            placeholder="Contoh: 123/BPS-1504/09/2026" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Tanggal Surat Tugas</label>
          <input type="date" value={form.tanggal_surat_tugas} onChange={sf('tanggal_surat_tugas')} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tanggal Tugas *</label>
          <input type="date" value={form.tanggal_tugas} onChange={sf('tanggal_tugas')} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Wilayah Tujuan *</label>
          <select value={form.tujuan_wilayah_id} onChange={sf('tujuan_wilayah_id')} className={selCls}>
            <option value="">— Pilih wilayah —</option>
            {wilayah.map(w => (
              <option key={w.id} value={w.id}>
                {w.desa_kelurahan} – {w.kecamatan}
                {w.rate_transport_lokal ? ` (${formatRupiah(w.rate_transport_lokal)})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Survei Terkait *</label>
          <select value={form.survei_id} onChange={sf('survei_id')} className={selCls}>
            <option value="">— Pilih survei terkait —</option>
            {surveys.map(s => <option key={s.id} value={s.id}>{s.nama_survei}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Maksud / Tujuan Perjalanan *</label>
        <select value={form.maksud_perjalanan} onChange={sf('maksud_perjalanan')} className={selCls}>
          <option value="">— Pilih maksud / tujuan kegiatan —</option>
          {kegiatanList.map(k => (
            <option key={k.id} value={k.nama}>{k.nama}</option>
          ))}
          {form.maksud_perjalanan && !kegiatanList.some(k => k.nama === form.maksud_perjalanan) && (
            <option value={form.maksud_perjalanan}>{form.maksud_perjalanan}</option>
          )}
        </select>
      </div>

      <div>
        <label className={labelCls}>Biaya Transport (Rp) — auto dari rate wilayah tujuan</label>
        <input type="number" min="0" value={form.biaya_transport} onChange={sf('biaya_transport')}
          className={inputCls} placeholder="Rp 0" />
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={save} disabled={saving}
          className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-60">
          {saving ? 'Menyimpan draft...' : (
            <>
              Simpan & Lanjut
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Rundown Kegiatan ─────────────────────────────────────────────────
function getDefaultRundown(laporan) {
  const tgl = laporan?.tanggal_tugas || laporan?.tanggal_berangkat || new Date().toISOString().slice(0, 10);
  const kec = laporan?.wilayah?.kecamatan || 'Kecamatan Tujuan';
  return [
    {
      hari_tanggal: tgl,
      waktu_mulai: '07:30',
      waktu_selesai: '08:00',
      kegiatan: 'Persiapan Turun Lapangan',
      lokasi: 'BPS Kab. Batang Hari',
      deskripsi: '',
    },
    {
      hari_tanggal: tgl,
      waktu_mulai: '08:00',
      waktu_selesai: '09:30',
      kegiatan: `Perjalanan dari BPS Kabupaten Batang Hari Menuju Kecamatan ${kec}`,
      lokasi: `Kecamatan ${kec}`,
      deskripsi: '',
    },
    {
      hari_tanggal: tgl,
      waktu_mulai: '09:30',
      waktu_selesai: '15:30',
      kegiatan: 'Turun Lapangan',
      lokasi: `Kecamatan ${kec}`,
      deskripsi: '',
    },
    {
      hari_tanggal: tgl,
      waktu_mulai: '15:30',
      waktu_selesai: '16:30',
      kegiatan: 'Perjalanan kembali ke Muara Bulian, Kab. Batang Hari',
      lokasi: 'BPS Kab. Batang Hari',
      deskripsi: '',
    },
  ];
}

function Step2({ laporan, onSaved }) {
  const [rows, setRows] = useState(() =>
    (laporan?.rundown ?? []).length > 0
      ? laporan.rundown.map(r => ({ ...r }))
      : getDefaultRundown(laporan)
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function addRow() {
    const tgl = laporan?.tanggal_tugas || laporan?.tanggal_berangkat || '';
    setRows(r => [...r, { hari_tanggal: tgl, waktu_mulai: '', waktu_selesai: '', kegiatan: '', lokasi: '', deskripsi: '' }]);
  }
  function removeRow(i) { setRows(r => r.filter((_, j) => j !== i)); }
  function update(i, k, v) { setRows(r => r.map((row, j) => j === i ? { ...row, [k]: v } : row)); }

  async function save() {
    const hasEmpty = rows.some(r => !r.kegiatan.trim());
    if (hasEmpty) { setError('Field Kegiatan wajib diisi pada tiap baris.'); return; }
    setSaving(true); setError('');
    const res = await api.put(`/perjalanan/${laporan.id}/rundown`, { rundown: rows });
    setSaving(false);
    if (res.success) onSaved({ ...laporan, rundown: res.data });
    else setError(res.message);
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-accent-orange dark:text-dark-accent-orange bg-accent-orange/5 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          Jadwal kegiatan otomatis diisi sesuai template resmi. Anda dapat menyesuaikan jam, lokasi, atau menambah kegiatan.
        </p>
        <button
          type="button"
          onClick={() => setRows(getDefaultRundown(laporan))}
          className="btn-secondary text-xs py-1.5 px-3 rounded-lg"
          title="Kembalikan ke template awal 4 kegiatan"
        >
          🔄 Reset Template
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="card p-4 space-y-3 relative group">
            {/* Nomor + hapus */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                Kegiatan #{i + 1}
              </span>
              {rows.length > 1 && (
                <button onClick={() => removeRow(i)}
                  className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-accent-orange dark:text-dark-text-secondary dark:hover:text-dark-accent-orange transition-all p-1 rounded-lg hover:bg-accent-orange/8">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>Hari/Tanggal</label>
                <input type="date" value={row.hari_tanggal ?? ''} onChange={e => update(i, 'hari_tanggal', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Waktu Mulai (WIB)</label>
                <input type="time" value={row.waktu_mulai ?? ''} onChange={e => update(i, 'waktu_mulai', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Waktu Selesai (WIB)</label>
                <input type="time" value={row.waktu_selesai ?? ''} onChange={e => update(i, 'waktu_selesai', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Lokasi</label>
                <input value={row.lokasi ?? ''} onChange={e => update(i, 'lokasi', e.target.value)}
                  placeholder="Nama lokasi" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Kegiatan *</label>
              <input value={row.kegiatan} onChange={e => update(i, 'kegiatan', e.target.value)}
                placeholder="Deskripsi kegiatan yang dilakukan" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Keterangan Tambahan</label>
              <input value={row.deskripsi ?? ''} onChange={e => update(i, 'deskripsi', e.target.value)}
                placeholder="Opsional — catatan tambahan" className={inputCls} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRow}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border-soft dark:border-dark-border-soft text-sm text-text-secondary dark:text-dark-text-secondary hover:border-navy/30 dark:hover:border-dark-navy/40 hover:text-navy dark:hover:text-dark-navy hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-all">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        Tambah Kegiatan
      </button>

      <div className="flex justify-end pt-2">
        <button onClick={save} disabled={saving}
          className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-60">
          {saving ? 'Menyimpan...' : (
            <>
              Simpan & Lanjut
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Dokumentasi & Ringkasan ─────────────────────────────────────────
function Step3({ laporan, onDone }) {
  const [fotos,     setFotos]     = useState(laporan?.foto ?? []);
  const [ringkasan, setRingkasan] = useState(laporan?.ringkasan_hasil ?? '');
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [drag,      setDrag]      = useState(false);
  const [error,     setError]     = useState('');
  const inputRef = useRef(null);

  async function uploadFile(file) {
    if (fotos.length >= 10) { setError('Maksimal 10 foto.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ukuran foto maksimal 5 MB.'); return; }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      setError('Format foto harus JPG, PNG, atau WEBP.'); return;
    }
    setUploading(true); setError('');
    const fd = new FormData();
    fd.append('foto', file);
    const res = await fetch(`/api/perjalanan/${laporan.id}/foto`, { method: 'POST', credentials: 'include', body: fd });
    const json = await res.json();
    setUploading(false);
    if (json.success) setFotos(f => [...f, json.data]);
    else setError(json.message);
  }

  async function deleteFoto(fotoId) {
    const res = await api.delete(`/perjalanan/${laporan.id}/foto/${fotoId}`);
    if (res.success) setFotos(f => f.filter(x => x.id !== fotoId));
  }

  async function finish() {
    setFinishing(true); setError('');
    // POST ke selesai — response adalah zip binary
    const res = await fetch(`/api/perjalanan/${laporan.id}/selesai`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ringkasan_hasil: ringkasan }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.message || 'Gagal generate dokumen.');
      setFinishing(false); return;
    }
    // Trigger download ZIP
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Perjalanan_${laporan.id}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFinishing(false);
    onDone();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-accent-orange dark:text-dark-accent-orange bg-accent-orange/5 px-3 py-2 rounded-lg">{error}</p>}

      {/* Drop zone */}
      <div>
        <label className={labelCls}>Foto Dokumentasi (maks. 10 foto, JPG/PNG/WEBP ≤ 5 MB)</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); [...e.dataTransfer.files].forEach(uploadFile); }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
            ${drag ? 'border-navy dark:border-dark-navy bg-navy/4' : 'border-border-soft dark:border-dark-border-soft hover:border-navy/30 dark:hover:border-dark-navy/40 hover:bg-navy/2 dark:hover:bg-dark-navy/4'}`}
        >
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
            onChange={(e) => [...e.target.files].forEach(uploadFile)} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Mengunggah...</p>
            </div>
          ) : (
            <>
              <span className="text-2xl">📸</span>
              <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary mt-1">Drag & drop atau klik</p>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{fotos.length}/10 foto</p>
            </>
          )}
        </div>
      </div>

      {/* Grid preview thumbnail */}
      {fotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {fotos.map((f, i) => (
            <div key={f.id ?? i} className="relative group rounded-xl overflow-hidden aspect-square bg-status-neutral/10">
              <img src={`/${f.path}`} alt={f.keterangan ?? `Foto ${i+1}`}
                className="w-full h-full object-cover" />
              <button onClick={() => deleteFoto(f.id)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-black/60 text-white transition-opacity">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Ringkasan */}
      <div>
        <label className={labelCls}>Ringkasan Hasil Perjalanan</label>
        <textarea value={ringkasan} onChange={e => setRingkasan(e.target.value)} rows={4}
          placeholder="Tuliskan ringkasan hasil kegiatan selama perjalanan dinas..."
          className={inputCls + ' resize-none'} />
      </div>

      {/* Info dokumen yang akan di-generate */}
      <div className="card p-4 bg-navy/3 dark:bg-dark-navy/6 border border-navy/12 dark:border-dark-navy/20">
        <p className="text-xs font-semibold text-navy dark:text-dark-navy mb-2">📄 Dokumen yang akan di-generate:</p>
        <ul className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
          <li>✅ Laporan Perjalanan Dinas.docx (termasuk jadwal & foto)</li>
          <li>✅ Pernyataan Tidak Menggunakan Kendaraan Dinas.docx</li>
          <li>✅ Daftar Pengeluaran Riil Transport Lokal.docx</li>
        </ul>
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-2">
          Semua dokumen di-pack dalam 1 file .zip
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={finish} disabled={finishing}
          className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-60">
          {finishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating dokumen...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Selesai & Download .zip
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Halaman utama ────────────────────────────────────────────────────────────
const STEPS = ['Data Perjalanan', 'Rundown Kegiatan', 'Dokumentasi & Selesai'];

export default function LaporanPerjalananPage() {
  const [mode,     setMode]     = useState('list'); // 'list' | 'wizard'
  const [step,     setStep]     = useState(0);
  const [laporan,  setLaporan]  = useState(null);   // laporan aktif di wizard
  const [list,     setList]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [petugas,  setPetugas]  = useState([]);
  const [wilayah,  setWilayah]  = useState([]);
  const [surveys,  setSurveys]  = useState([]);
  const [kegiatanList, setKegiatanList] = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [toast,    setToast]    = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [fPetugas, setFPetugas] = useState('');
  const [fStatus,  setFStatus]  = useState('');
  const [page,     setPage]     = useState(1);
  const [perPage,  setPerPage]  = useState(10);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const loadList = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (fPetugas) p.set('petugas_id', fPetugas);
    if (fStatus)  p.set('status',     fStatus);
    const res = await api.get('/perjalanan' + (p.toString() ? '?' + p : ''));
    if (res.success) setList(res.data);
    setLoading(false);
  }, [fPetugas, fStatus]);

  useEffect(() => {
    api.get('/master/petugas').then(r => { if (r.success) setPetugas(r.data); });
    api.get('/master/wilayah').then(r => { if (r.success) setWilayah(r.data); });
    api.get('/master/survei').then(r => { if (r.success) setSurveys(r.data); });
    api.get('/master/kegiatan').then(r => { if (r.success) setKegiatanList(r.data); });
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  async function startNew() {
    setLaporan(null);
    setStep(0);
    setMode('wizard');
  }

  async function resumeWizard(row) {
    setLoadingDetail(true);
    const res = await api.get(`/perjalanan/${row.id}/detail`);
    setLoadingDetail(false);
    if (res.success) {
      setLaporan(res.data);
      // Tentukan step berdasarkan progress
      if ((res.data.rundown ?? []).length > 0 || (res.data.foto ?? []).length > 0) {
        setStep(res.data.status_pengisian === 'selesai' ? 2 : 1);
      } else {
        setStep(0);
      }
      setMode('wizard');
    } else {
      showToast(res.message);
    }
  }

  function exitWizard() {
    setMode('list');
    setLaporan(null);
    setStep(0);
    loadList();
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await api.delete(`/perjalanan/${confirmId}`);
    setDeleting(false);
    setConfirmId(null);
    showToast(res.message);
    if (res.success) loadList();
  }

  async function redownload(row) {
    window.location.href = `/api/perjalanan/${row.id}/download`;
  }

  // Completed steps untuk WizardStepBar
  const completedSteps = laporan
    ? [
        ...(laporan.id ? [0] : []),
        ...((laporan.rundown ?? []).length > 0 ? [1] : []),
        ...(laporan.status_pengisian === 'selesai' ? [2] : []),
      ]
    : [];

  // ── Mode WIZARD ────────────────────────────────────────────────────────────
  if (mode === 'wizard') {
    return (
      <div className="space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">
              Laporan Perjalanan Dinas
            </h1>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
              {laporan ? `Draft #${laporan.id}${laporan.nomor_surat ? ' — ' + laporan.nomor_surat : ''}` : 'Buat laporan baru'}
            </p>
          </div>
          <button onClick={exitWizard}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Kembali ke daftar
          </button>
        </div>

        {/* Step indicator */}
        <WizardStepBar
          steps={STEPS}
          current={step}
          completed={completedSteps}
          onGoTo={(i) => { setStep(i); }}
        />

        {/* Step content */}
        <div className="card p-6">
          {step === 0 && (
            <Step1
              laporan={laporan}
              petugas={petugas}
              wilayah={wilayah}
              surveys={surveys}
              kegiatanList={kegiatanList}
              onSaved={(data) => { setLaporan(data); setStep(1); }}
            />
          )}
          {step === 1 && laporan && (
            <Step2
              laporan={laporan}
              onSaved={(data) => { setLaporan(data); setStep(2); }}
            />
          )}
          {step === 2 && laporan && (
            <Step3
              laporan={laporan}
              onDone={() => { showToast('Dokumen berhasil di-generate!'); exitWizard(); }}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Mode LIST ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">
            Laporan Perjalanan Dinas
          </h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            {loading ? '...' : `${list.length} laporan`}
          </p>
        </div>
        <button onClick={startNew}
          className="btn-primary flex items-center gap-1.5 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Buat Laporan Baru
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <label className={labelCls}>Petugas</label>
          <select value={fPetugas} onChange={e => setFPetugas(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-xl border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
            <option value="">Semua Petugas</option>
            {petugas.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-xl border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
        {(fPetugas||fStatus) && (
          <button onClick={() => { setFPetugas(''); setFStatus(''); }}
            className="text-sm text-text-secondary hover:text-accent-orange dark:text-dark-text-secondary dark:hover:text-dark-accent-orange transition-colors pb-1">
            Reset
          </button>
        )}
      </div>

      {/* Tabel daftar */}
      <div className="card p-5 space-y-4">
        <div className="overflow-x-auto rounded-xl border border-border-soft dark:border-dark-border-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy/5 dark:bg-dark-navy/10">
                {['Petugas','Nomor Surat','Wilayah Tujuan','Tgl Surat Tugas','Tgl Tugas','Biaya','Survei','Progress','Status','Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading || loadingDetail ? (
                Array.from({length: 4}).map((_, i) => (
                  <tr key={i} className="border-t border-border-soft dark:border-dark-border-soft">
                    {Array.from({length: 10}).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 rounded-full bg-status-neutral/15 animate-pulse" style={{width:`${40+j*5}%`}} /></td>
                    ))}
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-text-secondary dark:text-dark-text-secondary">Belum ada laporan perjalanan dinas.</td></tr>
              ) : (
                (() => {
                  const isAll = perPage === 'all';
                  const effectivePerPage = isAll ? (list.length || 1) : Number(perPage);
                  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(list.length / effectivePerPage));
                  const safePage = Math.min(Math.max(1, page), totalPages);
                  const startIndex = isAll ? 0 : (safePage - 1) * effectivePerPage;
                  const endIndex = isAll ? list.length : Math.min(startIndex + effectivePerPage, list.length);
                  const paginatedList = isAll ? list : list.slice(startIndex, endIndex);

                  return paginatedList.map(row => {
                    return (
                      <tr key={row.id} className="border-t border-border-soft dark:border-dark-border-soft hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium text-text-primary dark:text-dark-text-primary">{row.nama_petugas}</p>
                          <p className="text-xs text-text-secondary dark:text-dark-text-secondary capitalize">{row.jabatan || row.tipe_petugas}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-dark-text-secondary max-w-24 truncate">{row.nomor_surat || '—'}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-text-primary dark:text-dark-text-primary">{row.desa_kelurahan}</p>
                          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{row.kecamatan}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
                          {row.tanggal_surat_tugas || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono font-medium text-text-primary dark:text-dark-text-primary whitespace-nowrap">
                          {row.tanggal_tugas || row.tanggal_berangkat || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono whitespace-nowrap text-text-primary dark:text-dark-text-primary">
                          {formatRupiah(row.biaya_transport)}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-secondary dark:text-dark-text-secondary max-w-28 truncate">
                          {row.nama_survei || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                              {row.jumlah_rundown ?? 0} kegiatan
                            </span>
                            <span className="text-text-secondary/30 dark:text-dark-text-secondary/30">·</span>
                            <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                              {row.jumlah_foto ?? 0} foto
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_BADGE[row.status_pengisian] || ''}`}>
                            {row.status_pengisian}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Lanjutkan / Edit wizard */}
                            <button onClick={() => resumeWizard(row)} title={row.status_pengisian === 'draft' ? 'Lanjutkan wizard' : 'Buka wizard'}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-navy hover:bg-navy/8 dark:text-dark-text-secondary dark:hover:text-dark-navy dark:hover:bg-dark-navy/15 transition-all">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                              </svg>
                            </button>

                            {/* Download ulang (jika selesai) */}
                            {row.status_pengisian === 'selesai' && (
                              <button onClick={() => redownload(row)} title="Download ulang .zip"
                                className="p-1.5 rounded-lg text-text-secondary hover:text-navy hover:bg-navy/8 dark:text-dark-text-secondary dark:hover:text-dark-navy dark:hover:bg-dark-navy/15 transition-all">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                              </button>
                            )}

                            {/* Hapus */}
                            <button onClick={() => setConfirmId(row.id)} title="Hapus"
                              className="p-1.5 rounded-lg text-text-secondary hover:text-accent-orange hover:bg-accent-orange/8 dark:text-dark-text-secondary dark:hover:text-dark-accent-orange dark:hover:bg-dark-accent-orange/15 transition-all">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {!loading && !loadingDetail && (
          <Pagination
            totalItems={list.length}
            page={page}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(p) => { setPerPage(p); setPage(1); }}
            label="laporan"
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl bg-status-active text-white text-sm shadow-soft-lg">{toast}</div>
      )}

      <ConfirmDialog
        isOpen={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleting}
        message="Hapus laporan ini? File fisik juga akan dihapus."
      />
    </div>
  );
}
