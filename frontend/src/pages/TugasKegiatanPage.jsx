import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import RadialProgress from '../components/ui/RadialProgress';
import ColumnSelector from '../components/ui/ColumnSelector';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import TugasForm from '../components/TugasForm';
import AlokasiTahunanModal from '../components/AlokasiTahunanModal';
import { useColumnVisibility } from '../hooks/useColumnVisibility';

// ─── Konstanta ────────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  'Selesai':     'bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy',
  'Berjalan':    'bg-accent-orange/10 text-accent-orange dark:bg-dark-accent-orange/20 dark:text-dark-accent-orange',
  'Belum Mulai': 'bg-status-neutral/20 text-status-neutral dark:bg-dark-status-neutral/20 dark:text-dark-status-neutral',
};

const TIPE_BADGE = {
  pegawai: 'bg-navy/8 text-navy/70 dark:bg-dark-navy/15 dark:text-dark-navy/80',
  mitra:   'bg-accent-orange/8 text-accent-orange/70 dark:bg-dark-accent-orange/15 dark:text-dark-accent-orange/80',
};

const KATEGORI_BADGE = {
  Distribusi: 'bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy',
  Harga:      'bg-accent-orange/10 text-accent-orange dark:bg-dark-accent-orange/20 dark:text-dark-accent-orange',
  KTIP:       'bg-status-neutral/15 text-status-neutral dark:bg-dark-status-neutral/20 dark:text-dark-status-neutral',
  Sensus:     'bg-status-neutral/15 text-status-neutral dark:bg-dark-status-neutral/20 dark:text-dark-status-neutral',
};

// Definisi kolom tabel
const ALL_COLUMNS = [
  { key: 'survei',     label: 'Survei',    alwaysVisible: true },
  { key: 'wilayah',    label: 'Wilayah' },
  { key: 'petugas',    label: 'Petugas',   alwaysVisible: true },
  { key: 'peran',      label: 'Peran' },
  { key: 'pemeriksa',  label: 'Pemeriksa' },
  { key: 'periode',    label: 'Periode' },
  { key: 'target',     label: 'Target' },
  { key: 'selesai',    label: 'Selesai' },
  { key: 'progress',   label: 'Progres' },
  { key: 'status',     label: 'Status',    alwaysVisible: true },
  { key: 'deadline',   label: 'Deadline' },
];

// ─── Filter state awal ────────────────────────────────────────────────────────
const EMPTY_FILTERS = {
  survei_id: '', kecamatan: '', wilayah_id: '', petugas_id: '',
  kegiatan_id: '', tahun: '', bulan: '', triwulan_ke: '',
  minggu_ke: '', status: '', deadline_dari: '', deadline_sampai: '',
};

// ─── Helper: format tampilan periode ─────────────────────────────────────────
function PeriodeLabel({ row }) {
  if (!row.jenis_periode) return <span className="text-text-secondary dark:text-dark-text-secondary">—</span>;
  let label = String(row.tahun);
  switch (row.jenis_periode) {
    case 'mingguan':   label += ` / Mggu ${row.minggu_ke} Bln ${row.bulan}`; break;
    case 'bulanan':    label += ` / Bln ${row.bulan}`; break;
    case 'triwulanan': label += ` / TW ${row.triwulan_ke}`; break;
    default: break;
  }
  return <span className="font-mono text-xs">{label}</span>;
}

// ─── Deadline badge ───────────────────────────────────────────────────────────
function DeadlineBadge({ date, status }) {
  if (!date) return <span>—</span>;
  const isLate = status !== 'Selesai' && new Date(date) < new Date();
  return (
    <span className={`text-xs font-mono ${isLate ? 'text-accent-orange dark:text-dark-accent-orange font-semibold' : 'text-text-primary dark:text-dark-text-primary'}`}>
      {isLate && '⚠ '}{date}
    </span>
  );
}

// ─── Filter Row (inline di bawah header) ─────────────────────────────────────
function FilterRow({ filters, onChange, surveys, wilayahs, petugasList, kegiatans, visible, isSuperadmin }) {
  const kecamatanList = [...new Set(wilayahs.map((w) => w.kecamatan))].sort();
  const desaList = filters.kecamatan
    ? wilayahs.filter((w) => w.kecamatan === filters.kecamatan)
    : wilayahs;

  const s = 'w-full text-xs px-2 py-1.5 rounded-lg border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-navy/30 dark:focus:ring-dark-navy/30 transition-all';

  return (
    <tr className="bg-navy/2 dark:bg-dark-navy/5 border-t border-border-soft dark:border-dark-border-soft">
      {isSuperadmin && <td className="px-2 py-1.5 w-8" />} {/* checkbox col */}
      {visible.survei && (
        <td className="px-2 py-1.5">
          <select className={s} value={filters.survei_id} onChange={(e) => onChange('survei_id', e.target.value)}>
            <option value="">Semua Survei</option>
            {surveys.map((sv) => <option key={sv.id} value={sv.id}>{sv.nama_survei}</option>)}
          </select>
        </td>
      )}
      {visible.wilayah && (
        <td className="px-2 py-1.5 space-y-1">
          <select className={s} value={filters.kecamatan}
            onChange={(e) => { onChange('kecamatan', e.target.value); onChange('wilayah_id', ''); }}>
            <option value="">Semua Kecamatan</option>
            {kecamatanList.map((k) => <option key={k}>{k}</option>)}
          </select>
          <select className={s} value={filters.wilayah_id} onChange={(e) => onChange('wilayah_id', e.target.value)}>
            <option value="">Semua Desa</option>
            {desaList.map((w) => <option key={w.id} value={w.id}>{w.desa_kelurahan}</option>)}
          </select>
        </td>
      )}
      {visible.petugas && (
        <td className="px-2 py-1.5">
          <select className={s} value={filters.petugas_id} onChange={(e) => onChange('petugas_id', e.target.value)}>
            <option value="">Semua Petugas</option>
            {petugasList.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </td>
      )}
      {visible.peran && (
        <td className="px-2 py-1.5">
          <select className={s} value={filters.kegiatan_id} onChange={(e) => onChange('kegiatan_id', e.target.value)}>
            <option value="">Semua Peran</option>
            {kegiatans.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </td>
      )}
      {visible.periode && (
        <td className="px-2 py-1.5 space-y-1">
          <input type="number" placeholder="Tahun" className={s} value={filters.tahun}
            onChange={(e) => onChange('tahun', e.target.value)} min="2000" max="2100" />
          <select className={s} value={filters.bulan} onChange={(e) => onChange('bulan', e.target.value)}>
            <option value="">Semua Bulan</option>
            {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((b,i) => (
              <option key={i+1} value={i+1}>{b}</option>
            ))}
          </select>
        </td>
      )}
      {visible.target  && <td className="px-2 py-1.5" />}
      {visible.selesai && <td className="px-2 py-1.5" />}
      {visible.progress && <td className="px-2 py-1.5" />}
      {visible.status && (
        <td className="px-2 py-1.5">
          <select className={s} value={filters.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="">Semua Status</option>
            <option value="Belum Mulai">Belum Mulai</option>
            <option value="Berjalan">Berjalan</option>
            <option value="Selesai">Selesai</option>
          </select>
        </td>
      )}
      {visible.deadline && (
        <td className="px-2 py-1.5 space-y-1">
          <input type="date" className={s} value={filters.deadline_dari}
            onChange={(e) => onChange('deadline_dari', e.target.value)} title="Deadline dari" />
          <input type="date" className={s} value={filters.deadline_sampai}
            onChange={(e) => onChange('deadline_sampai', e.target.value)} title="Deadline sampai" />
        </td>
      )}
      <td className="px-2 py-1.5 w-20" /> {/* aksi col */}
    </tr>
  );
}

// ─── Halaman utama ────────────────────────────────────────────────────────────
export default function TugasKegiatanPage() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  // ── Data state ──────────────────────────────────────────────────────────────
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [surveys,     setSurveys]     = useState([]);
  const [wilayahs,    setWilayahs]    = useState([]);
  const [petugasList, setPetugasList] = useState([]);
  const [kegiatans,   setKegiatans]   = useState([]);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filters,  setFilters]  = useState(EMPTY_FILTERS);
  const [showFilter, setShowFilter] = useState(false);

  // ── Selection ───────────────────────────────────────────────────────────────
  const [selected,   setSelected]   = useState(new Set());

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [tugasModal,   setTugasModal]   = useState({ open: false, mode: 'add', row: null });
  const [alokasiModal, setAlokasiModal] = useState(false);
  const [confirm,      setConfirm]      = useState({ open: false, type: '', ids: [] });
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [toast,      setToast]        = useState('');

  // ── Column visibility ───────────────────────────────────────────────────────
  const { visible, toggle, reset: resetCols } = useColumnVisibility('tugas', ALL_COLUMNS);

  const fileInputRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  // ── Load dropdown options ───────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/master/survei'),
      api.get('/master/wilayah'),
      api.get('/master/petugas'),
      api.get('/master/kegiatan'),
    ]).then(([sv, wl, pt, kg]) => {
      if (sv.success) setSurveys(sv.data);
      if (wl.success) setWilayahs(wl.data);
      if (pt.success) setPetugasList(pt.data);
      if (kg.success) setKegiatans(kg.data);
    });
  }, []);

  // ── Build query string dari filters ────────────────────────────────────────
  const buildQuery = useCallback((f) => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v !== '') params.set(k, v); });
    return params.toString() ? '?' + params.toString() : '';
  }, []);

  // ── Load data ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    const res = await api.get('/tugas' + buildQuery(filters));
    if (res.success) setData(res.data);
    setLoading(false);
  }, [filters, buildQuery]);

  useEffect(() => { load(); }, [load]);

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const setFilter = (key, val) => setFilters((prev) => ({ ...prev, [key]: val }));
  const resetFilters = () => setFilters(EMPTY_FILTERS);

  const activeFilterCount = Object.values(filters).filter((v) => v !== '').length;

  // ── Selection helpers ───────────────────────────────────────────────────────
  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => {
    if (selected.size === data.length) setSelected(new Set());
    else setSelected(new Set(data.map((r) => r.id)));
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleDelete(ids) {
    setDeleting(true);
    const res = ids.length === 1
      ? await api.delete(`/tugas/${ids[0]}`)
      : await api.delete('/tugas/bulk', { ids });
    setDeleting(false);
    setConfirm({ open: false, type: '', ids: [] });
    showToast(res.message);
    if (res.success) load();
  }

  async function handleBulkSelesai() {
    const ids = [...selected];
    const res = await api.put('/tugas/bulk-selesai', { ids });
    setConfirm({ open: false, type: '', ids: [] });
    showToast(res.message);
    if (res.success) load();
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/tugas/import-excel', {
      method: 'POST', credentials: 'include', body: fd,
    });
    const json = await res.json();
    setImporting(false);
    setImportResult(json.data ?? null);
    showToast(json.message);
    if (json.success) load();
    e.target.value = '';
  }

  function handleExport() {
    const qs = buildQuery(filters);
    window.open('/api/tugas/export-excel' + qs, '_blank');
  }

  function handleTemplate() {
    window.open('/api/tugas/template-excel', '_blank');
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">
            Kelola Tugas Kegiatan
          </h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            {loading ? '...' : `${data.length} data`}
            {activeFilterCount > 0 && (
              <span className="ml-2 text-accent-orange dark:text-dark-accent-orange">
                · {activeFilterCount} filter aktif
              </span>
            )}
          </p>
        </div>

        {/* Toolbar kanan */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Column selector */}
          <ColumnSelector columns={ALL_COLUMNS} visible={visible} onToggle={toggle} onReset={resetCols} />

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all
              ${showFilter
                ? 'border-navy/30 bg-navy/8 text-navy dark:border-dark-navy/40 dark:bg-dark-navy/15 dark:text-dark-navy'
                : 'border-border-soft bg-surface text-text-secondary hover:text-text-primary dark:border-dark-border-soft dark:bg-dark-surface dark:text-dark-text-secondary'
              }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591L15.75 12.75v7.5a.75.75 0 0 1-.493.707l-3.75 1.5a.75.75 0 0 1-1.007-.707v-9l-4.591-5.431A2.25 2.25 0 0 1 5.25 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span className="text-xs bg-accent-orange text-white dark:bg-dark-accent-orange px-1.5 py-0.5 rounded-full font-mono">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Reset filter */}
          {activeFilterCount > 0 && (
            <button onClick={resetFilters}
              className="text-sm text-text-secondary dark:text-dark-text-secondary hover:text-accent-orange dark:hover:text-dark-accent-orange transition-colors">
              Reset filter
            </button>
          )}

          <div className="w-px h-5 bg-border-soft dark:bg-dark-border-soft" />

          {isSuperadmin && (
            <>
              {/* Excel tools */}
              <button onClick={handleTemplate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-border-soft bg-surface text-text-secondary hover:text-text-primary hover:border-navy/20 dark:border-dark-border-soft dark:bg-dark-surface dark:text-dark-text-secondary transition-all"
                title="Download template Excel kosong">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Template
              </button>

              <label
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-all
                  ${importing
                    ? 'border-accent-orange/30 bg-accent-orange/5 text-accent-orange dark:border-dark-accent-orange/30 dark:bg-dark-accent-orange/10 dark:text-dark-accent-orange'
                    : 'border-border-soft bg-surface text-text-secondary hover:text-text-primary hover:border-navy/20 dark:border-dark-border-soft dark:bg-dark-surface dark:text-dark-text-secondary'
                  }`}
                title="Import dari Excel"
              >
                {importing ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                )}
                {importing ? 'Mengimpor...' : 'Import'}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
              </label>

              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-border-soft bg-surface text-text-secondary hover:text-text-primary hover:border-navy/20 dark:border-dark-border-soft dark:bg-dark-surface dark:text-dark-text-secondary transition-all"
                title="Export ke Excel (dengan filter aktif)">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </button>

              {/* Bulk actions */}
              {selected.size > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-border-soft dark:border-dark-border-soft">
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    {selected.size} dipilih
                  </span>
                  <button
                    onClick={() => setConfirm({ open: true, type: 'bulk-selesai', ids: [...selected] })}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-navy/8 text-navy dark:bg-dark-navy/15 dark:text-dark-navy hover:bg-navy/15 transition-all">
                    Tandai Selesai
                  </button>
                  <button
                    onClick={() => setConfirm({ open: true, type: 'bulk-delete', ids: [...selected] })}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-accent-orange/8 text-accent-orange dark:bg-dark-accent-orange/15 dark:text-dark-accent-orange hover:bg-accent-orange/15 transition-all">
                    Hapus
                  </button>
                </div>
              )}

              <button
                id="btn-tambah-tugas"
                onClick={() => setTugasModal({ open: true, mode: 'add', row: null })}
                className="btn-primary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Tambah
              </button>

              <button
                id="btn-alokasi-tahunan"
                onClick={() => setAlokasiModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-navy/30 bg-navy/5 text-navy dark:border-dark-navy/40 dark:bg-dark-navy/10 dark:text-dark-navy hover:bg-navy/10 dark:hover:bg-dark-navy/20 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                Alokasi Tahunan
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Import result summary ────────────────────────────────────────────── */}
      {importResult && (
        <div className="card p-4 border border-border-soft dark:border-dark-border-soft">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Hasil Import Excel</h3>
            <button onClick={() => setImportResult(null)} className="text-text-secondary hover:text-text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-status-active dark:text-dark-status-active">✓ {importResult.imported} berhasil</span>
            {importResult.failed > 0 && (
              <span className="text-accent-orange dark:text-dark-accent-orange">✕ {importResult.failed} gagal</span>
            )}
          </div>
          {importResult.errors?.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-accent-orange dark:text-dark-accent-orange">
              {importResult.errors.map((e, i) => (
                <li key={i}>Baris {e.baris}: {e.pesan}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Tabel ───────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy/5 dark:bg-dark-navy/10">
                {/* Checkbox header */}
                {isSuperadmin && (
                  <th className="px-3 py-3 w-8">
                    <input type="checkbox"
                      checked={data.length > 0 && selected.size === data.length}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded accent-navy"
                    />
                  </th>
                )}
                {visible.survei && <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Survei</th>}
                {visible.wilayah && <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Wilayah</th>}
                {visible.petugas && <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Petugas</th>}
                {visible.peran && <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Peran</th>}
                {visible.pemeriksa && <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Pemeriksa</th>}
                {visible.periode && <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Periode</th>}
                {visible.target && <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Target</th>}
                {visible.selesai && <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Selesai</th>}
                {visible.progress && <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Progres</th>}
                {visible.status && <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Status</th>}
                {visible.deadline && <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Deadline</th>}
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Aksi</th>
              </tr>

              {/* ── Filter Row ── */}
              {showFilter && (
                <FilterRow
                  filters={filters}
                  onChange={setFilter}
                  surveys={surveys}
                  wilayahs={wilayahs}
                  petugasList={petugasList}
                  kegiatans={kegiatans}
                  visible={visible}
                  isSuperadmin={isSuperadmin}
                />
              )}
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border-soft dark:border-dark-border-soft">
                    {isSuperadmin && <td className="px-3 py-3"><div className="h-3 w-3.5 rounded bg-status-neutral/20 animate-pulse" /></td>}
                    {[...Array(Object.values(visible).filter(Boolean).length + 1)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 rounded-full bg-status-neutral/20 dark:bg-dark-status-neutral/15 animate-pulse" style={{ width: `${50 + (j*17)%40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={20} className="px-4 py-12 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
                    {activeFilterCount > 0
                      ? 'Tidak ada data yang cocok dengan filter aktif.'
                      : 'Belum ada data tugas kegiatan.'}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id}
                    className={`border-t border-border-soft dark:border-dark-border-soft transition-colors
                      ${selected.has(row.id) ? 'bg-navy/4 dark:bg-dark-navy/8' : 'hover:bg-navy/2 dark:hover:bg-dark-navy/4'}`}>

                    {/* Checkbox */}
                    {isSuperadmin && (
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selected.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          className="w-3.5 h-3.5 rounded accent-navy" />
                      </td>
                    )}

                    {/* Survei */}
                    {visible.survei && (
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary leading-tight">{row.nama_survei}</p>
                        <span className={`mt-0.5 inline-block text-xs px-2 py-0.5 rounded-full ${KATEGORI_BADGE[row.kategori] ?? ''}`}>
                          {row.kategori}
                        </span>
                      </td>
                    )}

                    {/* Wilayah */}
                    {visible.wilayah && (
                      <td className="px-4 py-3">
                        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{row.kecamatan}</p>
                        <p className="text-sm text-text-primary dark:text-dark-text-primary">{row.desa_kelurahan}</p>
                      </td>
                    )}

                    {/* Petugas */}
                    {visible.petugas && (
                      <td className="px-4 py-3">
                        <p className="text-sm text-text-primary dark:text-dark-text-primary leading-tight">{row.nama_petugas}</p>
                        <span className={`mt-0.5 inline-block text-xs px-2 py-0.5 rounded-full capitalize ${TIPE_BADGE[row.tipe_petugas] ?? ''}`}>
                          {row.tipe_petugas}
                        </span>
                      </td>
                    )}

                    {/* Peran */}
                    {visible.peran && (
                      <td className="px-4 py-3 text-sm text-text-primary dark:text-dark-text-primary max-w-36 truncate" title={row.nama_peran}>
                        {row.nama_peran}
                      </td>
                    )}

                    {/* Pemeriksa */}
                    {visible.pemeriksa && (
                      <td className="px-4 py-3 text-sm text-text-secondary dark:text-dark-text-secondary">
                        {row.nama_pemeriksa
                          ? <span className="text-text-primary dark:text-dark-text-primary">{row.nama_pemeriksa}</span>
                          : <span className="text-xs text-text-secondary/60 dark:text-dark-text-secondary/60">—</span>}
                      </td>
                    )}

                    {/* Periode */}
                    {visible.periode && (
                      <td className="px-4 py-3"><PeriodeLabel row={row} /></td>
                    )}

                    {/* Target */}
                    {visible.target && (
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-text-primary dark:text-dark-text-primary">
                        {row.target_sampel}
                      </td>
                    )}

                    {/* Selesai */}
                    {visible.selesai && (
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-text-primary dark:text-dark-text-primary">
                        {row.sampel_selesai}
                      </td>
                    )}

                    {/* Progress ring */}
                    {visible.progress && (
                      <td className="px-4 py-3 text-center">
                        <RadialProgress value={row.persen} size={44} strokeWidth={5} />
                      </td>
                    )}

                    {/* Status */}
                    {visible.status && (
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? ''}`}>
                          {row.status}
                        </span>
                      </td>
                    )}

                    {/* Deadline */}
                    {visible.deadline && (
                      <td className="px-4 py-3">
                        <DeadlineBadge date={row.deadline} status={row.status} />
                      </td>
                    )}

                    {/* Aksi */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setTugasModal({
                            open: true,
                            mode: isSuperadmin ? 'edit' : 'edit-selesai',
                            row,
                          })}
                          title="Edit"
                          className="p-1.5 rounded-lg text-text-secondary hover:text-navy hover:bg-navy/8 dark:text-dark-text-secondary dark:hover:text-dark-navy dark:hover:bg-dark-navy/15 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        {isSuperadmin && (
                          <button
                            onClick={() => setConfirm({ open: true, type: 'delete', ids: [row.id] })}
                            title="Hapus"
                            className="p-1.5 rounded-lg text-text-secondary hover:text-accent-orange hover:bg-accent-orange/8 dark:text-dark-text-secondary dark:hover:text-dark-accent-orange dark:hover:bg-dark-accent-orange/15 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Row count */}
        {!loading && data.length > 0 && (
          <div className="px-4 py-3 border-t border-border-soft dark:border-dark-border-soft">
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
              Menampilkan {data.length} data
            </p>
          </div>
        )}
      </div>

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl bg-status-active text-white text-sm shadow-soft-lg">
          {toast}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {tugasModal.open && (
        <TugasForm
          mode={tugasModal.mode}
          initialData={tugasModal.row}
          onClose={() => setTugasModal({ open: false, mode: 'add', row: null })}
          onSaved={() => load()}
        />
      )}

      {alokasiModal && (
        <AlokasiTahunanModal
          onClose={() => setAlokasiModal(false)}
          onSaved={() => { setAlokasiModal(false); load(); }}
        />
      )}

      {/* Confirm: single delete */}
      <ConfirmDialog
        isOpen={confirm.open && confirm.type === 'delete'}
        onConfirm={() => handleDelete(confirm.ids)}
        onCancel={() => setConfirm({ open: false, type: '', ids: [] })}
        loading={deleting}
        message="Hapus data tugas ini? Tindakan tidak dapat dibatalkan."
      />

      {/* Confirm: bulk delete */}
      <ConfirmDialog
        isOpen={confirm.open && confirm.type === 'bulk-delete'}
        onConfirm={() => handleDelete(confirm.ids)}
        onCancel={() => setConfirm({ open: false, type: '', ids: [] })}
        loading={deleting}
        message={`Hapus ${confirm.ids.length} data tugas yang dipilih? Tindakan tidak dapat dibatalkan.`}
        confirmLabel={`Hapus ${confirm.ids.length} Data`}
      />

      {/* Confirm: bulk selesai */}
      <ConfirmDialog
        isOpen={confirm.open && confirm.type === 'bulk-selesai'}
        onConfirm={handleBulkSelesai}
        onCancel={() => setConfirm({ open: false, type: '', ids: [] })}
        confirmLabel="Tandai Selesai"
        message={`Tandai ${confirm.ids.length} data sebagai Selesai (sampel_selesai = target_sampel)?`}
      />
    </div>
  );
}
