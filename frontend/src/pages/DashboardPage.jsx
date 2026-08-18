import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { api } from '../lib/api';
import { KpiCard, KpiCardPersen } from '../components/dashboard/KpiCard';
import DeadlinePanel from '../components/dashboard/DeadlinePanel';
import MiniCalendar from '../components/dashboard/MiniCalendar';
import ProgressTable from '../components/dashboard/ProgressTable';

// ─── Warna sesuai design token ────────────────────────────────────────────────
const COLOR_NAVY   = '#3E5C7E';
const COLOR_ORANGE = '#E8935A';
const COLOR_GREY   = '#C3CBD3';

const CHART_COLOR = (persen) => {
  const p = parseFloat(persen) || 0;
  if (p >= 100) return COLOR_NAVY;
  if (p > 0)    return COLOR_ORANGE;
  return COLOR_GREY;
};

// ─── KPI Icons ────────────────────────────────────────────────────────────────
const IconTotal = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
  </svg>
);
const IconBerjalan = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
  </svg>
);
const IconSelesai = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

// ─── Custom Tooltip untuk BarChart ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-surface dark:bg-dark-surface border border-border-soft dark:border-dark-border-soft rounded-xl shadow-soft-lg px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-text-primary dark:text-dark-text-primary mb-1 max-w-40 break-words">{label}</p>
      <p className="text-text-secondary dark:text-dark-text-secondary">
        Capaian: <span className="font-mono font-semibold text-text-primary dark:text-dark-text-primary">{p.value}%</span>
      </p>
      {p.payload && (
        <p className="text-text-secondary dark:text-dark-text-secondary">
          {p.payload.total_selesai} / {p.payload.total_target} sampel
        </p>
      )}
    </div>
  );
}

// ─── Chart view toggle ────────────────────────────────────────────────────────
const CHART_VIEWS = [
  { key: 'wilayah', label: 'Per Kecamatan' },
  { key: 'desa',    label: 'Per Desa' },
  { key: 'survei',  label: 'Per Survei' },
];

// ─── Halaman utama ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const today = new Date();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [tahun,    setTahun]    = useState(String(today.getFullYear()));
  const [bulan,    setBulan]    = useState('');
  const [years,    setYears]    = useState([]);
  const [chartView, setChartView] = useState('wilayah'); // wilayah | desa | survei

  // ── Data state ────────────────────────────────────────────────────────────
  const [summary,   setSummary]   = useState(null);
  const [chartData, setChartData] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [calDates,  setCalDates]  = useState([]);

  // ── Loading ───────────────────────────────────────────────────────────────
  const [loadingSum, setLoadingSum] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingDl,  setLoadingDl]  = useState(true);

  // ── Build query string ────────────────────────────────────────────────────
  const qs = useCallback((extra = {}) => {
    const p = { tahun, ...(bulan ? { bulan } : {}), ...extra };
    const params = new URLSearchParams(p);
    return params.toString() ? '?' + params.toString() : '';
  }, [tahun, bulan]);

  // ── Load available years ──────────────────────────────────────────────────
  useEffect(() => {
    api.get('/dashboard/years').then((res) => {
      if (res.success) setYears(res.data);
    });
  }, []);

  // ── Load summary KPI ──────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingSum(true);
    api.get('/dashboard/summary' + qs()).then((res) => {
      if (res.success) setSummary(res.data);
      setLoadingSum(false);
    });
  }, [qs]);

  // ── Load chart data ───────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingChart(true);
    const endpoint = chartView === 'survei'
      ? '/dashboard/progress-survei' + qs()
      : chartView === 'desa'
        ? '/dashboard/progress-wilayah' + qs({ kecamatan: 'ALL' })
        : '/dashboard/progress-wilayah' + qs();

    api.get(endpoint).then((res) => {
      if (res.success) setChartData(res.data);
      setLoadingChart(false);
    });
  }, [qs, chartView]);

  // ── Load deadlines ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingDl(true);
    api.get('/dashboard/deadline-dekat?hari=14').then((res) => {
      if (res.success) {
        setDeadlines(res.data);
        // Kumpulkan tanggal untuk kalender
        setCalDates(res.data.map((d) => d.deadline));
      }
      setLoadingDl(false);
    });
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  const BULAN_OPTS = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  return (
    <div className="space-y-5">
      {/* ── Header + Filter ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">
            Dasbor Utama
          </h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            Ringkasan progres kegiatan statistik
          </p>
        </div>

        {/* Filter tahun & bulan */}
        <div className="flex items-center gap-2">
          <select
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 dark:focus:ring-dark-navy/20 transition-all"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 dark:focus:ring-dark-navy/20 transition-all"
          >
            <option value="">Semua Bulan</option>
            {BULAN_OPTS.slice(1).map((b, i) => (
              <option key={i+1} value={i+1}>{b}</option>
            ))}
          </select>
          {bulan && (
            <button onClick={() => setBulan('')}
              className="text-sm text-text-secondary hover:text-accent-orange dark:text-dark-text-secondary dark:hover:text-dark-accent-orange transition-colors">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── 4 KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Tugas"
          value={loadingSum ? '…' : (summary?.total ?? 0)}
          sub={loadingSum ? '' : `${summary?.belum_mulai ?? 0} belum mulai`}
          icon={<IconTotal />}
          variant="neutral"
          loading={loadingSum}
        />
        <KpiCard
          label="Sedang Berjalan"
          value={loadingSum ? '…' : (summary?.berjalan ?? 0)}
          sub={loadingSum ? '' : `dari ${summary?.total ?? 0} total tugas`}
          icon={<IconBerjalan />}
          variant="berjalan"
          loading={loadingSum}
        />
        <KpiCard
          label="Sudah Selesai"
          value={loadingSum ? '…' : (summary?.selesai ?? 0)}
          sub={loadingSum ? '' : `${summary?.total_selesai ?? 0} / ${summary?.total_target ?? 0} sampel`}
          icon={<IconSelesai />}
          variant="selesai"
          loading={loadingSum}
        />
        <KpiCardPersen
          label="Rata-rata Capaian"
          value={loadingSum ? '…' : (summary?.rata_persen ?? 0)}
          sub={loadingSum ? '' : `tahun ${tahun}${bulan ? ' / bln ' + bulan : ''}`}
          loading={loadingSum}
        />
      </div>

      {/* ── Baris tengah: Chart + Deadline Panel ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar Chart — 2/3 lebar */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-heading font-semibold text-sm text-text-primary dark:text-dark-text-primary">
              Capaian Penyelesaian (%)
            </h2>
            {/* Toggle view */}
            <div className="flex items-center gap-1 bg-bg-page dark:bg-dark-bg-page rounded-xl p-0.5 border border-border-soft dark:border-dark-border-soft">
              {CHART_VIEWS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setChartView(v.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    chartView === v.key
                      ? 'bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary shadow-sm'
                      : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {loadingChart ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-navy/20 border-t-navy dark:border-dark-navy/20 dark:border-t-dark-navy rounded-full animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Belum ada data untuk periode ini.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -16, bottom: chartData.length > 8 ? 48 : 16 }}
                barSize={chartData.length > 12 ? 12 : 20}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-5" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'currentColor', className: 'text-text-secondary' }}
                  angle={chartData.length > 6 ? -35 : 0}
                  textAnchor={chartData.length > 6 ? 'end' : 'middle'}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: 'currentColor', className: 'text-text-secondary' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(62,92,126,0.06)' }} />
                <Bar dataKey="persen" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={CHART_COLOR(entry.persen)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Legend warna status */}
          <div className="flex items-center gap-4 mt-2 pt-3 border-t border-border-soft dark:border-dark-border-soft">
            {[
              { color: COLOR_NAVY,   label: 'Selesai (100%)' },
              { color: COLOR_ORANGE, label: 'Berjalan (1–99%)' },
              { color: COLOR_GREY,   label: 'Belum Mulai (0%)' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deadline Panel — 1/3 lebar */}
        <DeadlinePanel items={deadlines} loading={loadingDl} />
      </div>

      {/* ── Baris bawah: ProgressTable + MiniCalendar ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ProgressTable
            data={chartData}
            loading={loadingChart}
            title={
              chartView === 'survei'   ? 'Ringkasan per Survei'
              : chartView === 'desa'  ? 'Ringkasan per Desa/Kelurahan'
              : 'Ringkasan per Kecamatan'
            }
          />
        </div>
        <MiniCalendar
          deadlineDates={calDates}
          onMonthChange={() => { /* navigasi kalender tidak perlu reload data */ }}
        />
      </div>
    </div>
  );
}
