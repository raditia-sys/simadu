import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import RadialProgress from '../components/ui/RadialProgress';
import ProgressRingGrid from '../components/survei/ProgressRingGrid';
import Pagination from '../components/ui/Pagination';

const KATEGORI_BADGE = {
  Distribusi: 'bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy',
  Harga:      'bg-accent-orange/10 text-accent-orange dark:bg-dark-accent-orange/20 dark:text-dark-accent-orange',
  KTIP:       'bg-status-neutral/15 text-status-neutral dark:bg-dark-status-neutral/20 dark:text-dark-status-neutral',
  Sensus:     'bg-status-neutral/15 text-status-neutral dark:bg-dark-status-neutral/20 dark:text-dark-status-neutral',
};

const PERIODE_LABEL = {
  mingguan:    'Mingguan',
  bulanan:     'Bulanan',
  triwulanan:  'Triwulanan',
  tahunan:     'Tahunan',
};

const BULAN_OPTS = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

/**
 * SurveiPage — Template dinamis untuk semua halaman Kegiatan Statistik & Sensus Ekonomi.
 *
 * Props:
 * - surveiNama: string  e.g. "SAPB", "SHP", "SE2026 Persiapan"
 * - kodeSurvei: string  (opsional, e.g. "K3", "SLK-KSP", "BUMD")
 * - kategori: string   (opsional, untuk label konteks)
 */
export default function SurveiPage({ surveiNama, kodeSurvei, kategori }) {
  const today = new Date();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Survei info ────────────────────────────────────────────────────────────
  const [survei,       setSurvei]       = useState(null);
  const [surveiLoading,setSurveiLoading]= useState(true);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [tahun, setTahun] = useState(String(today.getFullYear()));
  const [bulan, setBulan] = useState('');
  const [tw,    setTw]    = useState('');
  const [years, setYears] = useState([]);

  // ── Progress data ──────────────────────────────────────────────────────────
  const [progressData, setProgressData]   = useState({ by_kecamatan: [], by_desa: [] });
  const [progLoading,  setProgLoading]    = useState(false);
  const [drillKec,     setDrillKec]       = useState(null); // kecamatan yang sedang dibuka

  // ── Petugas tabel ─────────────────────────────────────────────────────────
  const [petugasData,    setPetugasData]    = useState([]);
  const [petugasLoading, setPetugasLoading] = useState(false);
  const [showPetugas,    setShowPetugas]    = useState(false);
  const [petugasPage,    setPetugasPage]    = useState(1);
  const [petugasPerPage, setPetugasPerPage] = useState(10);
  const [petugasSearch,  setPetugasSearch]  = useState('');

  // ── Dokumen ───────────────────────────────────────────────────────────────
  const [dokumen, setDokumen] = useState([]);

  // ── Tab aktif ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('progress'); // 'progress' | 'petugas' | 'dokumen'

  // ── Load survei info ───────────────────────────────────────────────────────
  useEffect(() => {
    setSurveiLoading(true);
    setSurvei(null);
    setProgressData({ by_kecamatan: [], by_desa: [] });
    setPetugasData([]);

    const params = new URLSearchParams();
    if (surveiNama) params.set('nama', surveiNama);
    if (kodeSurvei) params.set('kode', kodeSurvei);

    api.get('/survei-statistik/info?' + params.toString()).then((res) => {
      if (res.success && res.data) {
        setSurvei(res.data);
      } else {
        setSurvei(null);
      }
      setSurveiLoading(false);
    });
    api.get('/dashboard/years').then((res) => {
      if (res.success) setYears(res.data);
    });
  }, [surveiNama, kodeSurvei]);

  // ── Build filter QS ───────────────────────────────────────────────────────
  const filterQs = useCallback((extra = {}) => {
    if (!survei) return '';
    const p = { survei_id: survei.id, tahun, ...(bulan ? { bulan } : {}), ...(tw ? { triwulan_ke: tw } : {}), ...extra };
    return '?' + new URLSearchParams(p).toString();
  }, [survei, tahun, bulan, tw]);

  // ── Load progress ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!survei) return;
    setProgLoading(true);
    setDrillKec(null);
    api.get('/survei-statistik/progress' + filterQs()).then((res) => {
      if (res.success) setProgressData(res.data);
      setProgLoading(false);
    });
  }, [survei, filterQs]);

  // ── Load petugas (lazy) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!survei || tab !== 'petugas') return;
    setPetugasLoading(true);
    api.get('/survei-statistik/petugas' + filterQs(drillKec ? { kecamatan: drillKec } : {})).then((res) => {
      if (res.success) setPetugasData(res.data);
      setPetugasLoading(false);
    });
  }, [survei, tab, filterQs, drillKec]);

  // ── Load dokumen (lazy) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!survei || tab !== 'dokumen') return;
    api.get('/dokumen?survei_id=' + survei.id).then((res) => {
      if (res.success) setDokumen(res.data);
    });
  }, [survei, tab]);

  // ── Drill down ke desa ────────────────────────────────────────────────────
  const desaForDrill = drillKec
    ? progressData.by_desa.filter((d) => d.kecamatan === drillKec)
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Info Card Survei ─────────────────────────────────────────────── */}
      <div className="card p-5">
        {surveiLoading ? (
          <div className="space-y-2">
            <div className="h-5 w-48 rounded-full bg-status-neutral/15 animate-pulse" />
            <div className="h-3 w-64 rounded-full bg-status-neutral/10 animate-pulse" />
          </div>
        ) : !survei ? (
          // Survei belum terdaftar di sistem
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-accent-orange/10 text-accent-orange dark:bg-dark-accent-orange/10 dark:text-dark-accent-orange flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold text-text-primary dark:text-dark-text-primary">
                {surveiNama}
              </h1>
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                Survei ini belum terdaftar di sistem. Silakan tambahkan melalui{' '}
                <button
                  onClick={() => navigate('/master/survei')}
                  className="text-navy dark:text-dark-navy underline underline-offset-2 hover:no-underline"
                >
                  Master Survei
                </button>.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
              {/* Radial progress overall */}
              <RadialProgress
                value={parseFloat(survei._summary?.persen_overall) || 0}
                size={64}
                strokeWidth={6}
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Kode survei badge */}
                  {survei.kode_survei && (
                    <span className="text-xs px-2 py-0.5 rounded-md font-mono font-semibold bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy">
                      {survei.kode_survei}
                    </span>
                  )}
                  <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">
                    {survei.nama_survei}
                  </h1>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${KATEGORI_BADGE[survei.kategori] ?? ''}`}>
                    {survei.kategori}
                  </span>
                  {/* Periode badge — tampilkan rentang bulan jika tahunan */}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-status-neutral/10 text-status-neutral dark:bg-dark-status-neutral/15 dark:text-dark-status-neutral">
                    {survei.jenis_periode === 'tahunan' && survei.bulan_mulai && survei.bulan_selesai
                      ? `Tahunan (${BULAN_OPTS[survei.bulan_mulai]}–${BULAN_OPTS[survei.bulan_selesai]})`
                      : (PERIODE_LABEL[survei.jenis_periode] ?? survei.jenis_periode)
                    }
                  </span>
                </div>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
                  {survei._summary?.total_tugas ?? 0} tugas terdaftar
                  {survei._summary?.tahun_min && ` · ${survei._summary.tahun_min}–${survei._summary.tahun_max}`}
                  {' '}·{' '}
                  <span className="font-mono">
                    {survei._summary?.total_selesai ?? 0}/{survei._summary?.total_target ?? 0}
                  </span>{' '}sampel
                </p>
                {/* Rentang tanggal koleksi */}
                {survei.jenis_periode === 'mingguan' && survei.tanggal_mulai_koleksi && survei.tanggal_selesai_koleksi ? (
                  <p className="text-xs text-text-secondary/70 dark:text-dark-text-secondary/70 mt-1">
                    📅 Mg1: tgl {survei.tanggal_mulai_koleksi}–{survei.tanggal_selesai_koleksi}
                    {survei.tanggal_mulai_mg2 && survei.tanggal_selesai_mg2 && (
                      <span> &nbsp;·&nbsp; Mg2: tgl {survei.tanggal_mulai_mg2}–{survei.tanggal_selesai_mg2}</span>
                    )}
                    {' '}setiap bulan
                  </p>
                ) : survei.tanggal_mulai_koleksi && survei.tanggal_selesai_koleksi ? (
                  <p className="text-xs text-text-secondary/70 dark:text-dark-text-secondary/70 mt-1">
                    📅 Pengumpulan data: tgl {survei.tanggal_mulai_koleksi}–{survei.tanggal_selesai_koleksi} setiap {PERIODE_LABEL[survei.jenis_periode]?.toLowerCase() ?? 'periode'}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Tautan entri data — buka di tab baru */}
            {survei.tautan_entri_data && (
              <a
                href={survei.tautan_entri_data}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center gap-2 flex-shrink-0 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Entri Data
              </a>
            )}
          </div>
        )}
      </div>

      {/* Hanya lanjut jika survei ditemukan */}
      {survei && (
        <>
          {/* ── Filter bar ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-secondary dark:text-dark-text-secondary font-medium">Filter:</span>
            <select value={tahun} onChange={(e) => setTahun(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Tampilkan field periode sesuai jenis */}
            {survei.jenis_periode === 'bulanan' && (
              <select value={bulan} onChange={(e) => setBulan(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-sm border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
                <option value="">Semua Bulan</option>
                {BULAN_OPTS.slice(1).map((b, i) => <option key={i+1} value={i+1}>{b}</option>)}
              </select>
            )}
            {survei.jenis_periode === 'mingguan' && (
              <select value={bulan} onChange={(e) => setBulan(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-sm border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
                <option value="">Semua Bulan</option>
                {BULAN_OPTS.slice(1).map((b, i) => <option key={i+1} value={i+1}>{b}</option>)}
              </select>
            )}
            {survei.jenis_periode === 'triwulanan' && (
              <select value={tw} onChange={(e) => setTw(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-sm border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
                <option value="">Semua Triwulan</option>
                {[1,2,3,4].map((t) => <option key={t} value={t}>TW {t}</option>)}
              </select>
            )}

            {(bulan || tw) && (
              <button onClick={() => { setBulan(''); setTw(''); }}
                className="text-sm text-text-secondary hover:text-accent-orange dark:text-dark-text-secondary dark:hover:text-dark-accent-orange transition-colors">
                Reset
              </button>
            )}
          </div>

          {/* ── Tab Navigation ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-0.5 border-b border-border-soft dark:border-dark-border-soft">
            {[
              { key: 'progress', label: 'Monitoring Progres' },
              { key: 'petugas',  label: 'Data Petugas' },
              { key: 'dokumen',  label: 'Materi & Dokumen' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                  tab === key
                    ? 'border-navy text-navy dark:border-dark-navy dark:text-dark-navy'
                    : 'border-transparent text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Monitoring Progres ─────────────────────────────────────── */}
          {tab === 'progress' && (
            <ProgressRingGrid
              items={drillKec ? desaForDrill : progressData.by_kecamatan}
              title={drillKec ? `Desa/Kelurahan — Kec. ${drillKec}` : 'Progres per Kecamatan'}
              loading={progLoading}
              drillLabel={drillKec}
              onDrill={(kec) => setDrillKec(kec)}
              onBack={() => setDrillKec(null)}
            />
          )}

          {/* ── Tab: Data Petugas ───────────────────────────────────────────── */}
          {tab === 'petugas' && (() => {
            const filteredPetugas = (petugasData || []).filter((r) => {
              if (!petugasSearch.trim()) return true;
              const q = petugasSearch.toLowerCase();
              return (
                (r.nama_petugas || '').toLowerCase().includes(q) ||
                (r.tipe_petugas || '').toLowerCase().includes(q) ||
                (r.nama_peran || '').toLowerCase().includes(q) ||
                (r.desa_kelurahan || '').toLowerCase().includes(q) ||
                (r.kecamatan || '').toLowerCase().includes(q)
              );
            });

            const totalItems = filteredPetugas.length;
            const isAll = petugasPerPage === 'all';
            const effectivePerPage = isAll ? (totalItems || 1) : Number(petugasPerPage);
            const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / effectivePerPage));
            const safePage = Math.min(Math.max(1, petugasPage), totalPages);

            const startIndex = isAll ? 0 : (safePage - 1) * effectivePerPage;
            const endIndex = isAll ? totalItems : Math.min(startIndex + effectivePerPage, totalItems);
            const paginatedPetugas = isAll ? filteredPetugas : filteredPetugas.slice(startIndex, endIndex);

            return (
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border-soft dark:border-dark-border-soft pb-3">
                  <div>
                    <h2 className="font-heading font-semibold text-sm text-text-primary dark:text-dark-text-primary">
                      Data Petugas — {survei.nama_survei} ({tahun})
                    </h2>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                      Daftar alokasi beban tugas, wilayah, target, dan realisasi sampel petugas.
                    </p>
                  </div>

                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                      type="search"
                      value={petugasSearch}
                      onChange={(e) => { setPetugasSearch(e.target.value); setPetugasPage(1); }}
                      placeholder="Cari nama / peran / desa..."
                      className="w-full pl-9 pr-3.5 py-1.5 rounded-xl text-xs bg-bg-page dark:bg-dark-bg-page border border-border-soft dark:border-dark-border-soft text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border-soft dark:border-dark-border-soft">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-navy/4 dark:bg-dark-navy/8">
                        {['Petugas','Tipe','Peran','Wilayah','Periode','Target','Selesai','Progres','Deadline'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {petugasLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-t border-border-soft dark:border-dark-border-soft">
                            {Array.from({ length: 9 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <div className="h-3 rounded-full bg-status-neutral/15 animate-pulse" style={{ width: `${40 + j * 7}%` }} />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : paginatedPetugas.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
                            Belum ada petugas terdaftar untuk survei ini pada periode tersebut.
                          </td>
                        </tr>
                      ) : (
                        paginatedPetugas.map((row) => {
                          const persen = parseFloat(row.persen) || 0;
                          let periodeLabel = String(row.tahun);
                          if (row.jenis_periode === 'mingguan')   periodeLabel += ` / Mggu ${row.minggu_ke} Bln ${row.bulan}`;
                          else if (row.jenis_periode === 'bulanan') periodeLabel += ` / Bln ${row.bulan}`;
                          else if (row.jenis_periode === 'triwulanan') periodeLabel += ` / TW ${row.triwulan_ke}`;

                          const isLate = row.deadline && new Date(row.deadline) < new Date() && persen < 100;

                          return (
                            <tr key={row.id} className="border-t border-border-soft dark:border-dark-border-soft hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-colors">
                              <td className="px-4 py-3 font-medium text-text-primary dark:text-dark-text-primary whitespace-nowrap">
                                {row.nama_petugas}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${row.tipe_petugas === 'pegawai' ? 'bg-navy/8 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'bg-accent-orange/8 text-accent-orange dark:bg-dark-accent-orange/15 dark:text-dark-accent-orange'}`}>
                                  {row.tipe_petugas}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-text-secondary dark:text-dark-text-secondary max-w-36 truncate" title={row.nama_peran}>
                                {row.nama_peran}
                              </td>
                              <td className="px-4 py-3 text-xs text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
                                <span className="text-text-primary dark:text-dark-text-primary">{row.desa_kelurahan}</span>
                                <br />
                                <span className="text-text-secondary dark:text-dark-text-secondary">{row.kecamatan}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
                                {periodeLabel}
                              </td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums text-text-primary dark:text-dark-text-primary">
                                {row.target_sampel}
                              </td>
                              <td className="px-4 py-3 text-right font-mono tabular-nums text-text-primary dark:text-dark-text-primary">
                                {row.sampel_selesai}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 h-1.5 rounded-full bg-status-neutral/15 overflow-hidden">
                                    <div className={`h-full rounded-full ${persen >= 100 ? 'bg-navy dark:bg-dark-navy' : persen > 0 ? 'bg-accent-orange dark:bg-dark-accent-orange' : 'bg-status-neutral dark:bg-dark-status-neutral'}`}
                                      style={{ width: `${Math.min(100, persen)}%` }} />
                                  </div>
                                  <span className="text-xs font-mono tabular-nums text-text-secondary dark:text-dark-text-secondary w-9 text-right">
                                    {persen}%
                                  </span>
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-xs font-mono whitespace-nowrap ${isLate ? 'text-accent-orange dark:text-dark-accent-orange font-semibold' : 'text-text-secondary dark:text-dark-text-secondary'}`}>
                                {isLate && '⚠ '}{row.deadline || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {!petugasLoading && (
                  <Pagination
                    totalItems={totalItems}
                    page={safePage}
                    perPage={petugasPerPage}
                    onPageChange={setPetugasPage}
                    onPerPageChange={(p) => { setPetugasPerPage(p); setPetugasPage(1); }}
                    label="petugas"
                  />
                )}
              </div>
            );
          })()}

          {/* ── Tab: Materi & Dokumen ───────────────────────────────────────── */}
          {tab === 'dokumen' && (
            <div className="card p-5 space-y-5">
              {/* Tautan Entri Data Utama */}
              {survei.tautan_entri_data && (
                <div className="p-4 rounded-2xl border border-border-soft dark:border-dark-border-soft flex items-center justify-between gap-4 bg-navy/4 dark:bg-dark-navy/8">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔗</span>
                      <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                        Tautan Entri Data Utama ({survei.nama_survei})
                      </p>
                    </div>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5 truncate max-w-xs md:max-w-md font-mono">
                      {survei.tautan_entri_data}
                    </p>
                  </div>
                  <a href={survei.tautan_entri_data} target="_blank" rel="noopener noreferrer"
                    className="btn-primary text-sm flex items-center gap-1.5 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    Buka Link
                  </a>
                </div>
              )}

              {/* Tautan / Link Entri Tambahan dari Manajemen Dokumen */}
              {dokumen.filter(d => d.mime_type === 'text/url' || d.path?.startsWith('http')).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3 flex items-center gap-2">
                    <span>🔗</span> Tautan Entri & Link Terkait ({dokumen.filter(d => d.mime_type === 'text/url' || d.path?.startsWith('http')).length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dokumen.filter(d => d.mime_type === 'text/url' || d.path?.startsWith('http')).map((doc) => (
                      <div key={doc.id} className="p-3.5 rounded-xl border border-border-soft dark:border-dark-border-soft flex items-center justify-between gap-3 bg-surface dark:bg-dark-surface hover:border-navy/30 transition-all">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🔗</span>
                            <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{doc.nama_file}</p>
                          </div>
                          <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5 font-mono truncate">{doc.path}</p>
                          {doc.deskripsi && (
                            <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary mt-0.5 line-clamp-1">{doc.deskripsi}</p>
                          )}
                        </div>
                        <a href={doc.path} target="_blank" rel="noopener noreferrer"
                          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 flex-shrink-0">
                          Buka Link ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materi dari field materi_dokumen */}
              {survei.materi_dokumen && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2">
                    Materi Kegiatan
                  </h3>
                  <div className="prose prose-sm max-w-none text-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap text-sm p-4 rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page">
                    {survei.materi_dokumen}
                  </div>
                </div>
              )}

              {/* Dokumen File Fisik Terlampir */}
              {dokumen.filter(d => d.mime_type !== 'text/url' && !d.path?.startsWith('http')).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-3 flex items-center gap-2">
                    <span>📄</span> Dokumen File Terlampir ({dokumen.filter(d => d.mime_type !== 'text/url' && !d.path?.startsWith('http')).length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dokumen.filter(d => d.mime_type !== 'text/url' && !d.path?.startsWith('http')).map((doc) => (
                      <div key={doc.id} className="p-3 rounded-xl border border-border-soft dark:border-dark-border-soft flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-navy/8 dark:bg-dark-navy/15 flex-shrink-0">
                          <svg className="w-5 h-5 text-navy dark:text-dark-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">{doc.nama_file}</p>
                          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{doc.kategori}</p>
                        </div>
                        <a href={`/api/dokumen/download/${doc.id}`} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-text-secondary hover:text-navy hover:bg-navy/8 dark:hover:text-dark-navy dark:hover:bg-dark-navy/15 transition-all flex-shrink-0" title="Download">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Kosong */}
              {dokumen.length === 0 && !survei.tautan_entri_data && !survei.materi_dokumen && (
                <div className="py-8 text-center">
                  <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                    Belum ada materi, tautan entri, atau dokumen terlampir untuk survei ini.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
