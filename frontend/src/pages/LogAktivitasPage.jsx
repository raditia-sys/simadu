import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const AKSI_CLASS = {
  login:           'bg-navy/8 text-navy dark:bg-dark-navy/15 dark:text-dark-navy',
  logout:          'bg-status-neutral/10 text-status-neutral dark:bg-dark-status-neutral/15 dark:text-dark-status-neutral',
  upload_dokumen:  'bg-navy/8 text-navy dark:bg-dark-navy/15 dark:text-dark-navy',
  hapus_dokumen:   'bg-accent-orange/8 text-accent-orange dark:bg-dark-accent-orange/15 dark:text-dark-accent-orange',
  hapus_tugas:     'bg-accent-orange/8 text-accent-orange dark:bg-dark-accent-orange/15 dark:text-dark-accent-orange',
  default:         'bg-status-neutral/8 text-status-neutral dark:bg-dark-status-neutral/12 dark:text-dark-status-neutral',
};

function getAksiClass(aksi = '') {
  const key = Object.keys(AKSI_CLASS).find(k => aksi.startsWith(k));
  return AKSI_CLASS[key] || AKSI_CLASS.default;
}

export default function LogAktivitasPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [users,   setUsers]   = useState([]);

  const [f, setF] = useState({
    user_id: '', aksi: '', dari: '', sampai: today, limit: '200',
  });

  const load = async () => {
    setLoading(true);
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
    const res = await api.get('/log' + (p.toString() ? '?' + p : ''));
    if (res.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    // Ambil list user untuk filter
    api.get('/me').then(() => {}); // ping auth
    load();
  }, []);

  const sf = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  // Grup per hari
  const grouped = {};
  data.forEach(row => {
    const day = row.waktu?.slice(0, 10) || 'Unknown';
    grouped[day] = grouped[day] || [];
    grouped[day].push(row);
  });
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">Log Aktivitas</h1>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
          {loading ? '...' : `${data.length} entri`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1 block">Jenis Aksi</label>
          <input value={f.aksi} onChange={e => sf('aksi', e.target.value)} placeholder="Cari aksi..."
            className="text-sm px-3 py-1.5 rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all w-40" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1 block">Dari Tanggal</label>
          <input type="date" value={f.dari} onChange={e => sf('dari', e.target.value)}
            className="text-sm px-3 py-1.5 rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1 block">Sampai Tanggal</label>
          <input type="date" value={f.sampai} onChange={e => sf('sampai', e.target.value)}
            className="text-sm px-3 py-1.5 rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all" />
        </div>
        <div>
          <label className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1 block">Maks. entri</label>
          <select value={f.limit} onChange={e => sf('limit', e.target.value)}
            className="text-sm px-3 py-1.5 rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
            {['50','100','200','500'].map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={load} className="btn-primary text-sm">Terapkan</button>
        <button onClick={() => { setF({ user_id:'', aksi:'', dari:'', sampai: today, limit:'200' }); setTimeout(load, 50); }}
          className="text-sm text-text-secondary hover:text-accent-orange dark:text-dark-text-secondary dark:hover:text-dark-accent-orange transition-colors">
          Reset
        </button>
      </div>

      {/* Timeline per hari */}
      {loading ? (
        <div className="card divide-y divide-border-soft dark:divide-dark-border-soft">
          {Array.from({length: 8}).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="w-16 h-3 rounded-full bg-status-neutral/15 animate-pulse" />
              <div className="w-24 h-3 rounded-full bg-status-neutral/10 animate-pulse" />
              <div className="flex-1 h-3 rounded-full bg-status-neutral/10 animate-pulse" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="card py-12 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
          Tidak ada log untuk filter ini.
        </div>
      ) : (
        days.map(day => (
          <div key={day} className="space-y-1">
            <p className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide px-1">
              {day}
            </p>
            <div className="card divide-y divide-border-soft dark:divide-dark-border-soft">
              {grouped[day].map(row => (
                <div key={row.id} className="px-5 py-2.5 flex items-start gap-3 hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-colors">
                  <span className="text-xs font-mono text-text-secondary dark:text-dark-text-secondary flex-shrink-0 mt-0.5 w-14">
                    {row.waktu?.slice(11, 16)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getAksiClass(row.aksi)}`}>
                    {row.aksi}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-primary dark:text-dark-text-primary truncate">{row.objek}</p>
                    {row.detail && (
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary truncate">
                        {typeof row.detail === 'string' ? row.detail : JSON.stringify(row.detail)}
                      </p>
                    )}

                  </div>
                  <span className="text-xs text-text-secondary dark:text-dark-text-secondary flex-shrink-0">
                    {row.nama_user || '—'}
                    {row.role_user && <span className="ml-1 opacity-60">({row.role_user})</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
