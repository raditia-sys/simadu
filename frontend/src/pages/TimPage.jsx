import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import RadialProgress from '../components/ui/RadialProgress';
import Pagination from '../components/ui/Pagination';

// Nama-nama anggota Subbagian Umum sesuai instruksi
const SUBBAG_ANGGOTA_NAMES = [
  'habib asror',
  'ida candra',
  'yusmiradewi',
  'madik',
  'lanna sari siregar',
];

function getKategoriPegawai(person) {
  const n = (person.nama || '').trim().toLowerCase();
  const j = (person.jabatan || '').trim().toLowerCase();

  if (n === 'hartono' || j.includes('kepala bps')) return 'kepala';
  if (n.includes('angger halim') || j.includes('kasubbag')) return 'kasubbag';
  if (SUBBAG_ANGGOTA_NAMES.some((sub) => n.includes(sub))) return 'subbag';
  return 'fungsional';
}

function PersonCard({ person }) {
  const persen = parseFloat(person.rata_persen) || 0;
  const isPegawai = person.tipe === 'pegawai';

  return (
    <div className="card p-4 flex flex-col justify-between hover:shadow-soft-lg transition-all border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface rounded-2xl group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${
                isPegawai
                  ? 'bg-gradient-to-br from-navy to-navy-light text-white dark:from-dark-navy dark:to-navy'
                  : 'bg-gradient-to-br from-accent-orange to-amber-500 text-white dark:from-dark-accent-orange dark:to-amber-600'
              }`}
            >
              {person.nama?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-text-primary dark:text-dark-text-primary group-hover:text-navy dark:group-hover:text-dark-navy transition-colors line-clamp-1">
                {person.nama}
              </h3>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary font-mono">
                {person.nip_atau_kode_mitra || '—'}
              </p>
            </div>
          </div>

          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${
              isPegawai
                ? 'bg-navy/8 text-navy dark:bg-dark-navy/20 dark:text-dark-navy'
                : 'bg-accent-orange/8 text-accent-orange dark:bg-dark-accent-orange/20 dark:text-dark-accent-orange'
            }`}
          >
            {person.tipe}
          </span>
        </div>

        {person.jabatan && (
          <div className="mb-3 px-2.5 py-1 rounded-lg bg-navy/3 dark:bg-dark-navy/6 border border-border-soft dark:border-dark-border-soft">
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary line-clamp-1">
              💼 <span className="text-text-primary dark:text-dark-text-primary font-medium">{person.jabatan}</span>
            </p>
          </div>
        )}

        {person.kontak && (
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-text-secondary/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
            </svg>
            <span className="font-mono text-xs">{person.kontak}</span>
          </p>
        )}
      </div>

      {/* Footer Statistik Beban Kerja */}
      <div className="pt-3 border-t border-border-soft dark:border-dark-border-soft flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            Beban Tugas: <span className="font-bold text-text-primary dark:text-dark-text-primary">{person.total_tugas ?? 0}</span>
          </p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            Selesai: <span className="font-bold text-navy dark:text-dark-navy">{person.tugas_selesai ?? 0}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="text-right">
            <span className="text-xs font-bold text-text-primary dark:text-dark-text-primary">
              {persen.toFixed(0)}%
            </span>
            <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary">Progres</p>
          </div>
          <RadialProgress value={persen} size={38} strokeWidth={4} />
        </div>
      </div>
    </div>
  );
}

export default function TimPage() {
  const [data, setData] = useState({ pegawai: [], mitra: [] });
  const [loading, setLoading] = useState(true);

  // Accordion bar collapse states
  const [showMaps, setShowMaps] = useState(false);
  const [showPegawaiSection, setShowPegawaiSection] = useState(true);
  const [showMitraSection, setShowMitraSection] = useState(true);

  // Expand full directory list within bar
  const [expandPegawaiList, setExpandPegawaiList] = useState(false);
  const [expandMitraList, setExpandMitraList] = useState(false);

  // Filters & Search
  const [qPegawai, setQPegawai] = useState('');
  const [filterPegawaiKategori, setFilterPegawaiKategori] = useState('semua');
  const [pegawaiPage, setPegawaiPage] = useState(1);
  const [pegawaiPerPage, setPegawaiPerPage] = useState(10);

  const [qMitra, setQMitra] = useState('');
  const [mitraPage, setMitraPage] = useState(1);
  const [mitraPerPage, setMitraPerPage] = useState(10);

  const load = async () => {
    setLoading(true);
    const res = await api.get('/tim');
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Struktur Organisasi breakdown
  const orgStructure = useMemo(() => {
    const pList = data.pegawai || [];
    let kepala = null;
    let kasubbag = null;
    const subbagAnggota = [];
    const fungsional = [];

    pList.forEach((p) => {
      const kat = getKategoriPegawai(p);
      if (kat === 'kepala') {
        kepala = p;
      } else if (kat === 'kasubbag') {
        kasubbag = p;
      } else if (kat === 'subbag') {
        subbagAnggota.push(p);
      } else {
        fungsional.push(p);
      }
    });

    if (!kepala && pList.length > 0) kepala = pList[0];

    return { kepala, kasubbag, subbagAnggota, fungsional };
  }, [data.pegawai]);

  // Filtered pegawai list
  const filteredPegawai = useMemo(() => {
    return (data.pegawai || []).filter((p) => {
      const matchQ =
        !qPegawai ||
        p.nama?.toLowerCase().includes(qPegawai.toLowerCase()) ||
        p.nip_atau_kode_mitra?.toLowerCase().includes(qPegawai.toLowerCase()) ||
        p.jabatan?.toLowerCase().includes(qPegawai.toLowerCase()) ||
        p.kontak?.toLowerCase().includes(qPegawai.toLowerCase());

      const kat = getKategoriPegawai(p);
      const matchKat =
        filterPegawaiKategori === 'semua' ||
        (filterPegawaiKategori === 'kepala' && kat === 'kepala') ||
        (filterPegawaiKategori === 'subbag' && (kat === 'kasubbag' || kat === 'subbag')) ||
        (filterPegawaiKategori === 'fungsional' && kat === 'fungsional');

      return matchQ && matchKat;
    });
  }, [data.pegawai, qPegawai, filterPegawaiKategori]);

  const paginatedPegawai = useMemo(() => {
    if (pegawaiPerPage === 'all') return filteredPegawai;
    const limit = Number(pegawaiPerPage);
    const start = (pegawaiPage - 1) * limit;
    return filteredPegawai.slice(start, start + limit);
  }, [filteredPegawai, pegawaiPage, pegawaiPerPage]);

  // Reset page saat filter/search pegawai berubah
  useEffect(() => {
    setPegawaiPage(1);
  }, [qPegawai, filterPegawaiKategori, pegawaiPerPage]);

  // Filtered mitra list with pagination
  const filteredMitra = useMemo(() => {
    return (data.mitra || []).filter((m) => {
      if (!qMitra) return true;
      return (
        m.nama?.toLowerCase().includes(qMitra.toLowerCase()) ||
        m.nip_atau_kode_mitra?.toLowerCase().includes(qMitra.toLowerCase()) ||
        m.kontak?.toLowerCase().includes(qMitra.toLowerCase())
      );
    });
  }, [data.mitra, qMitra]);

  const paginatedMitra = useMemo(() => {
    if (mitraPerPage === 'all') return filteredMitra;
    const limit = Number(mitraPerPage);
    const start = (mitraPage - 1) * limit;
    return filteredMitra.slice(start, start + limit);
  }, [filteredMitra, mitraPage, mitraPerPage]);

  // Reset page saat search mitra berubah
  useEffect(() => {
    setMitraPage(1);
  }, [qMitra, mitraPerPage]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header Halaman ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-navy/10 dark:bg-dark-navy/20 text-navy dark:text-dark-navy flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <h1 className="font-heading text-2xl font-bold text-text-primary dark:text-dark-text-primary">
              Tim & Organisasi
            </h1>
          </div>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
            BPS Kabupaten Batang Hari · Struktur organisasi, direktori pegawai, mitra statistik, dan lokasi kantor
          </p>
        </div>

        {/* Quick summary pill counters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-xl bg-surface dark:bg-dark-surface border border-border-soft dark:border-dark-border-soft text-xs font-semibold text-text-primary dark:text-dark-text-primary flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-navy dark:bg-dark-navy" />
            {data.pegawai?.length || 0} Pegawai
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-surface dark:bg-dark-surface border border-border-soft dark:border-dark-border-soft text-xs font-semibold text-text-primary dark:text-dark-text-primary flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-accent-orange dark:bg-dark-accent-orange" />
            {data.mitra?.length || 0} Mitra Statistik
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BAR 1: LOKASI KANTOR BPS KABUPATEN BATANG HARI (GMAPS)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="card overflow-hidden border border-border-soft dark:border-dark-border-soft rounded-2xl shadow-soft">
        <button
          onClick={() => setShowMaps(!showMaps)}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 bg-surface dark:bg-dark-surface hover:bg-navy/5 dark:hover:bg-dark-navy/5 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-text-primary dark:text-dark-text-primary">
                Lokasi Kantor BPS Kabupaten Batang Hari
              </h2>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                Jl. Jenderal Sudirman No. 34, Rengas Condong, Kec. Muara Bulian
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary hidden sm:inline">
              {showMaps ? 'Sembunyikan Peta' : 'Tampilkan Peta'}
            </span>
            <div className={`p-1.5 rounded-lg text-text-secondary dark:text-dark-text-secondary transition-transform duration-200 ${showMaps ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </button>

        {showMaps && (
          <div className="p-4 sm:p-5 pt-0 border-t border-border-soft dark:border-dark-border-soft">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch mt-4">
              {/* Google Maps Iframe */}
              <div className="lg:col-span-8 rounded-xl overflow-hidden border border-border-soft dark:border-dark-border-soft shadow-inner bg-slate-100 dark:bg-slate-900 min-h-[260px] sm:min-h-[300px]">
                <iframe
                  title="Peta Lokasi Kantor BPS Kabupaten Batang Hari"
                  src="https://maps.google.com/maps?q=Badan%20Pusat%20Statistik%20Kabupaten%20Batang%20Hari&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  className="w-full h-full min-h-[260px] sm:min-h-[300px] border-0"
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              {/* Info Kantor Card */}
              <div className="lg:col-span-4 flex flex-col justify-between p-4 sm:p-5 rounded-xl bg-bg-page dark:bg-dark-bg-page border border-border-soft dark:border-dark-border-soft space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy">
                      Kantor Resmi
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Aktif Melayani
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-sm text-text-primary dark:text-dark-text-primary">
                      Badan Pusat Statistik Kab. Batang Hari
                    </h3>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 leading-relaxed">
                      Jl. Jenderal Sudirman No. 34, Rengas Condong, Kec. Muara Bulian, Kabupaten Batang Hari, Jambi 36613
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-text-secondary dark:text-dark-text-secondary pt-2 border-t border-border-soft dark:border-dark-border-soft">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary dark:text-dark-text-primary w-20 flex-shrink-0">Telepon:</span>
                      <span>(0743) 21066</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary dark:text-dark-text-primary w-20 flex-shrink-0">Email:</span>
                      <span className="font-mono">bps1504@bps.go.id</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary dark:text-dark-text-primary w-20 flex-shrink-0">Layanan PST:</span>
                      <span>08.00 – 15.30 WIB</span>
                    </div>
                  </div>
                </div>

                <a
                  href="https://www.google.com/maps/search/?api=1&query=Badan+Pusat+Statistik+Kabupaten+Batang+Hari"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center justify-center gap-2 text-xs py-2.5 w-full rounded-xl"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Petunjuk Arah Google Maps
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BAR 2: BAR PEGAWAI & STRUKTUR ORGANISASI
      ════════════════════════════════════════════════════════════════════ */}
      <div className="card overflow-hidden border border-border-soft dark:border-dark-border-soft rounded-2xl shadow-soft">
        <button
          onClick={() => setShowPegawaiSection(!showPegawaiSection)}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 bg-surface dark:bg-dark-surface hover:bg-navy/5 dark:hover:bg-dark-navy/5 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-navy/10 dark:bg-dark-navy/20 text-navy dark:text-dark-navy flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-base font-bold text-text-primary dark:text-dark-text-primary">
                  Pegawai & Struktur Organisasi
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy">
                  {data.pegawai?.length || 0} Pegawai
                </span>
              </div>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                Struktur hierarki resmi BPS Kabupaten Batang Hari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary hidden sm:inline">
              {showPegawaiSection ? 'Sembunyikan' : 'Buka Struktur'}
            </span>
            <div className={`p-1.5 rounded-lg text-text-secondary dark:text-dark-text-secondary transition-transform duration-200 ${showPegawaiSection ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </button>

        {showPegawaiSection && (
          <div className="p-4 sm:p-6 pt-0 border-t border-border-soft dark:border-dark-border-soft space-y-6">

            {/* ── BAGAN STRUKTUR ORGANISASI (Visual Diagram Sesuai Screenshot) ── */}
            <div className="mt-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-100/80 to-slate-200/50 dark:from-slate-900/60 dark:to-slate-900/30 border border-border-soft dark:border-dark-border-soft">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-soft/60 dark:border-dark-border-soft/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="font-heading text-xs uppercase font-bold tracking-wider text-text-secondary dark:text-dark-text-secondary">
                    Bagan Struktur Organisasi BPS Kabupaten Batang Hari
                  </h3>
                </div>
                <span className="text-[11px] text-text-secondary dark:text-dark-text-secondary italic">
                  Hierarki Jabatan
                </span>
              </div>

              {/* Diagram Container */}
              <div className="max-w-3xl mx-auto flex flex-col items-center">

                {/* ── LEVEL 1: KEPALA BPS (Hijau Muda) ── */}
                <div className="w-full max-w-sm z-10">
                  <div className="p-4 rounded-xl border-2 border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 shadow-sm text-center transition-all hover:shadow-md">
                    <span className="inline-block px-3.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-widest bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs">
                      KEPALA
                    </span>
                    <h4 className="font-heading font-bold text-base text-slate-900 dark:text-emerald-50 mt-2">
                      {orgStructure.kepala?.nama || 'Hartono'}
                    </h4>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {orgStructure.kepala?.jabatan || 'Kepala BPS Kabupaten Batang Hari'}
                    </p>
                    {orgStructure.kepala?.nip_atau_kode_mitra && (
                      <p className="text-[11px] font-mono text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                        NIP. {orgStructure.kepala.nip_atau_kode_mitra}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── LEVEL 2 & CONNECTORS: SUBBAGIAN UMUM (Kanan) + CONTINUOUS STEM (Tengah) ── */}
                <div className="w-full relative flex items-center justify-center my-0">
                  {/* Garis vertikal tengah: Berjalan kontinu penuh dari bawah Kepala ke atas Fungsional tanpa putus */}
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-slate-700 dark:bg-slate-300 pointer-events-none" />

                  {/* 2-Kolom Grid: Kolom kiri spacer kosong, Kolom kanan cabang + Box Subbagian Umum */}
                  <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-0 py-6 items-center">
                    {/* Spacer Kolom Kiri (agar garis tengah berada tepat di 50%) */}
                    <div className="hidden md:block" />

                    {/* Kolom Kanan: Garis Cabang Horizontal + Box Subbagian Umum */}
                    <div className="flex items-center z-10 pl-0 md:pl-0">
                      {/* Garis cabang horizontal: Menghubungkan garis tengah persis ke sisi kiri Box Subbagian Umum */}
                      <div className="w-6 sm:w-10 h-0.5 bg-slate-700 dark:bg-slate-300 flex-shrink-0" />

                      {/* Box Subbagian Umum */}
                      <div className="flex-1 min-w-0 pr-1 sm:pr-4">
                        <div className="p-4 rounded-xl border-2 border-pink-400 dark:border-pink-500 bg-pink-50 dark:bg-pink-950/70 shadow-sm transition-all hover:shadow-md">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-3 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-pink-600 text-white dark:bg-pink-500 shadow-xs">
                              Subbagian Umum
                            </span>
                            <span className="text-[10px] font-bold text-pink-700 dark:text-pink-300">
                              6 Personil
                            </span>
                          </div>

                          {/* Kasubbag */}
                          <div className="mt-2.5 pb-2 border-b border-pink-200 dark:border-pink-800/60">
                            <p className="text-[10px] uppercase font-bold text-pink-700 dark:text-pink-300 tracking-wider">
                              Kepala Subbagian Umum
                            </p>
                            <p className="text-sm font-bold text-slate-900 dark:text-pink-100">
                              {orgStructure.kasubbag?.nama || 'Angger Halim Ismail'}
                            </p>
                            {orgStructure.kasubbag?.nip_atau_kode_mitra && (
                              <p className="text-[10px] font-mono text-pink-700/80 dark:text-pink-300/80">
                                NIP. {orgStructure.kasubbag.nip_atau_kode_mitra}
                              </p>
                            )}
                          </div>

                          {/* Anggota Subbag */}
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] uppercase font-bold text-pink-700 dark:text-pink-300 tracking-wider">
                              Anggota Subbag Umum:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {orgStructure.subbagAnggota.map((ang) => (
                                <div
                                  key={ang.id}
                                  className="px-2 py-1 rounded-md bg-white/80 dark:bg-pink-900/40 border border-pink-200 dark:border-pink-800/50 text-[11px]"
                                >
                                  <p className="font-semibold text-slate-900 dark:text-pink-100 truncate">{ang.nama}</p>
                                  <p className="text-[10px] text-pink-700 dark:text-pink-300 truncate">{ang.jabatan}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── LEVEL 3: KELOMPOK JABATAN FUNGSIONAL (Bawah - Biru Muda) ── */}
                <div className="w-full max-w-2xl z-10">
                  <div className="p-4 sm:p-5 rounded-xl border-2 border-sky-400 dark:border-sky-500 bg-sky-50 dark:bg-sky-950/70 shadow-sm text-center transition-all hover:shadow-md">
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-3.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-sky-600 text-white dark:bg-sky-500 shadow-xs">
                        Kelompok Jabatan Fungsional
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200 text-sky-800 dark:bg-sky-900 dark:text-sky-200">
                        {orgStructure.fungsional.length} Pegawai
                      </span>
                    </div>

                    <p className="text-xs text-sky-900/80 dark:text-sky-200/80 mt-2">
                      Statistisi Ahli Madya, Statistisi Ahli Muda, Statistisi Ahli Pertama, Statistisi Penyelia/Mahir, Pranata Komputer, Penata Layanan & Pelaksana
                    </p>

                    {/* Quick Preview Chips Fungsional */}
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                      {orgStructure.fungsional.map((fung) => (
                        <span
                          key={fung.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-sky-900/50 border border-sky-200/70 dark:border-sky-800/60 text-xs font-medium text-slate-800 dark:text-sky-100 shadow-2xs"
                          title={`${fung.nama} (${fung.jabatan || 'Fungsional'})`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          <span className="font-semibold">{fung.nama}</span>
                          <span className="text-[10px] text-sky-700 dark:text-sky-300">· {fung.jabatan?.replace('Statistisi ', 'Stat. ') || 'Fungsional'}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── TOGGLE & DIREKTORI LENGKAP PEGAWAI ── */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  onClick={() => setExpandPegawaiList(!expandPegawaiList)}
                  className="btn-secondary text-xs flex items-center gap-2 py-2 px-3.5 rounded-xl"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                  {expandPegawaiList ? 'Tutup Daftar Kartu Pegawai' : 'Buka Direktori Lengkap Pegawai'}
                </button>

                {expandPegawaiList && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Search Pegawai */}
                    <input
                      type="text"
                      value={qPegawai}
                      onChange={(e) => setQPegawai(e.target.value)}
                      placeholder="Cari nama, NIP, jabatan..."
                      className="px-3 py-1.5 rounded-xl text-xs border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 w-48 sm:w-56"
                    />

                    {/* Filter Kategori */}
                    <select
                      value={filterPegawaiKategori}
                      onChange={(e) => setFilterPegawaiKategori(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl text-xs border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20"
                    >
                      <option value="semua">Semua Unit</option>
                      <option value="kepala">Pimpinan / Kepala</option>
                      <option value="subbag">Subbagian Umum</option>
                      <option value="fungsional">Fungsional</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Grid Kartu Pegawai (Jika Dibuka) */}
              {expandPegawaiList && (
                <div className="space-y-4">
                  {filteredPegawai.length === 0 ? (
                    <div className="card py-8 text-center text-xs text-text-secondary dark:text-dark-text-secondary">
                      Tidak ada pegawai yang cocok dengan kriteria pencarian.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {paginatedPegawai.map((p) => (
                          <PersonCard key={p.id} person={p} />
                        ))}
                      </div>

                      <Pagination
                        totalItems={filteredPegawai.length}
                        page={pegawaiPage}
                        perPage={pegawaiPerPage}
                        onPageChange={setPegawaiPage}
                        onPerPageChange={setPegawaiPerPage}
                        label="pegawai"
                      />
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BAR 3: BAR MITRA STATISTIK
      ════════════════════════════════════════════════════════════════════ */}
      <div className="card overflow-hidden border border-border-soft dark:border-dark-border-soft rounded-2xl shadow-soft">
        <button
          onClick={() => setShowMitraSection(!showMitraSection)}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 bg-surface dark:bg-dark-surface hover:bg-navy/5 dark:hover:bg-dark-navy/5 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-orange/10 dark:bg-dark-accent-orange/20 text-accent-orange dark:text-dark-accent-orange flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-base font-bold text-text-primary dark:text-dark-text-primary">
                  Mitra Statistik
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-accent-orange/10 text-accent-orange dark:bg-dark-accent-orange/20 dark:text-dark-accent-orange">
                  {data.mitra?.length || 0} Mitra
                </span>
              </div>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                Daftar mitra statistik BPS Kabupaten Batang Hari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary hidden sm:inline">
              {showMitraSection ? 'Sembunyikan' : 'Buka Mitra'}
            </span>
            <div className={`p-1.5 rounded-lg text-text-secondary dark:text-dark-text-secondary transition-transform duration-200 ${showMitraSection ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </button>

        {showMitraSection && (
          <div className="p-4 sm:p-6 pt-0 border-t border-border-soft dark:border-dark-border-soft space-y-4">
            {/* Ringkasan Mitra Panel */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-accent-orange/5 via-navy/5 to-transparent border border-border-soft dark:border-dark-border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-sm text-text-primary dark:text-dark-text-primary">
                  Total {data.mitra?.length || 0} Mitra Statistik Terdaftar
                </h3>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                  Mitra bertugas dalam pengumpulan data survei dan sensus di seluruh wilayah Kabupaten Batang Hari.
                </p>
              </div>

              <button
                onClick={() => setExpandMitraList(!expandMitraList)}
                className="btn-primary text-xs flex items-center gap-2 py-2 px-3.5 rounded-xl whitespace-nowrap self-start sm:self-auto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                {expandMitraList ? 'Tutup Daftar Mitra' : 'Buka Direktori Mitra'}
              </button>
            </div>

            {/* Direktori Lengkap Mitra (Jika Dibuka) */}
            {expandMitraList && (
              <div className="space-y-4 pt-2">
                {/* Search Mitra Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="relative flex-1 max-w-sm">
                    <input
                      type="text"
                      value={qMitra}
                      onChange={(e) => setQMitra(e.target.value)}
                      placeholder="Cari nama mitra, kode, kontak..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange/20"
                    />
                    <svg className="w-4 h-4 absolute left-3 top-2.5 text-text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>

                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    Total Ditemukan <span className="font-semibold text-text-primary dark:text-dark-text-primary">{filteredMitra.length}</span> mitra
                  </span>
                </div>

                {/* Grid Kartu Mitra */}
                {paginatedMitra.length === 0 ? (
                  <div className="card py-8 text-center text-xs text-text-secondary dark:text-dark-text-secondary">
                    Tidak ada mitra yang cocok dengan kriteria pencarian.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {paginatedMitra.map((m) => (
                      <PersonCard key={m.id} person={m} />
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                <Pagination
                  totalItems={filteredMitra.length}
                  page={mitraPage}
                  perPage={mitraPerPage}
                  onPageChange={setMitraPage}
                  onPerPageChange={setMitraPerPage}
                  label="mitra"
                />
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

