import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import RadialProgress from '../components/ui/RadialProgress';

function TipeTag({ tipe }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full capitalize font-medium
      ${tipe === 'pegawai'
        ? 'bg-navy/8 text-navy dark:bg-dark-navy/15 dark:text-dark-navy'
        : 'bg-accent-orange/8 text-accent-orange dark:bg-dark-accent-orange/15 dark:text-dark-accent-orange'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tipe === 'pegawai' ? 'bg-navy/60 dark:bg-dark-navy/60' : 'bg-accent-orange/60 dark:bg-dark-accent-orange/60'}`} />
      {tipe}
    </span>
  );
}

function PersonCard({ person }) {
  const persen = parseFloat(person.rata_persen) || 0;
  return (
    <div className="card p-4 flex items-start gap-4 hover:shadow-soft-lg transition-all">
      {/* Avatar inisial */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0
        ${person.tipe === 'pegawai'
          ? 'bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy'
          : 'bg-accent-orange/10 text-accent-orange dark:bg-dark-accent-orange/20 dark:text-dark-accent-orange'
        }`}>
        {(person.nama || '?').slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary truncate">{person.nama}</p>
            {person.nip_atau_kode_mitra && (
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary font-mono">{person.nip_atau_kode_mitra}</p>
            )}
          </div>
          <TipeTag tipe={person.tipe} />
        </div>

        {person.kontak && (
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
            </svg>
            {person.kontak}
          </p>
        )}

        {/* Stats mini */}
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-border-soft dark:border-dark-border-soft">
          <div className="flex items-center gap-1.5">
            <RadialProgress value={persen} size={32} strokeWidth={3} />
            <span className="text-xs text-text-secondary dark:text-dark-text-secondary font-mono">{persen}%</span>
          </div>
          <div className="text-xs text-text-secondary dark:text-dark-text-secondary">
            <span className="font-semibold text-text-primary dark:text-dark-text-primary">{person.tugas_selesai}</span>/{person.total_tugas} tugas selesai
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TimPage() {
  const [data,    setData]    = useState({ pegawai: [], mitra: [] });
  const [loading, setLoading] = useState(true);
  const [q,       setQ]       = useState('');
  const [tipe,    setTipe]    = useState('');

  const load = async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q)    p.set('q',    q);
    if (tipe) p.set('tipe', tipe);
    const res = await api.get('/tim' + (p.toString() ? '?' + p : ''));
    if (res.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [q, tipe]);

  const totalPegawai = data.pegawai.length;
  const totalMitra   = data.mitra.length;

  const Skeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({length: 6}).map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-status-neutral/15 animate-pulse" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3 w-3/4 rounded-full bg-status-neutral/15 animate-pulse" />
              <div className="h-2.5 w-1/2 rounded-full bg-status-neutral/10 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">Tim & Organisasi</h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            {totalPegawai} pegawai · {totalMitra} mitra
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / NIP / kontak..."
            className="px-3.5 py-2 rounded-xl text-sm border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all w-56" />
          <div className="flex items-center gap-0.5 bg-bg-page dark:bg-dark-bg-page rounded-xl p-0.5 border border-border-soft dark:border-dark-border-soft">
            {[{val:'',label:'Semua'},{val:'pegawai',label:'Pegawai'},{val:'mitra',label:'Mitra'}].map(o => (
              <button key={o.val} onClick={() => setTipe(o.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${tipe === o.val ? 'bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary shadow-sm' : 'text-text-secondary dark:text-dark-text-secondary'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? <Skeleton /> : (
        <>
          {/* Pegawai */}
          {(!tipe || tipe === 'pegawai') && data.pegawai.length > 0 && (
            <section>
              <h2 className="font-heading font-semibold text-sm text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-3">
                Pegawai ({data.pegawai.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.pegawai.map(p => <PersonCard key={p.id} person={p} />)}
              </div>
            </section>
          )}

          {/* Mitra */}
          {(!tipe || tipe === 'mitra') && data.mitra.length > 0 && (
            <section>
              <h2 className="font-heading font-semibold text-sm text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-3">
                Mitra Statistik ({data.mitra.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.mitra.map(p => <PersonCard key={p.id} person={p} />)}
              </div>
            </section>
          )}

          {data.pegawai.length === 0 && data.mitra.length === 0 && (
            <div className="card py-12 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
              Belum ada data petugas.
            </div>
          )}
        </>
      )}
    </div>
  );
}
