import { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import RadialProgress from '../ui/RadialProgress';

/**
 * KecamatanTugasModal — Modal pop-up ringkas daftar tugas kegiatan per kecamatan.
 *
 * Kolom yang ditampilkan:
 * 1. Petugas
 * 2. Periode
 * 3. Desa / Kelurahan
 * 4. Progres
 * 5. Deadline
 * 6. Catatan
 */
export default function KecamatanTugasModal({
  kecamatan,
  survei,
  items = [],
  kecInfo,
  onClose,
}) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (r) =>
        (r.nama_petugas || '').toLowerCase().includes(q) ||
        (r.desa_kelurahan || '').toLowerCase().includes(q) ||
        (r.catatan || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalTarget = items.reduce((s, r) => s + (parseInt(r.target_sampel) || 0), 0);
  const totalSelesai = items.reduce((s, r) => s + (parseInt(r.sampel_selesai) || 0), 0);
  const persenKec = totalTarget > 0 ? Math.round((totalSelesai / totalTarget) * 100) : (kecInfo?.persen || 0);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Daftar Tugas Kegiatan — Kec. ${kecamatan}`}
      size="lg"
      footer={
        <div className="flex justify-end w-full">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
            Tutup
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner Ringkasan Kecamatan */}
        <div className="p-4 rounded-2xl bg-navy/4 dark:bg-dark-navy/8 border border-border-soft dark:border-dark-border-soft flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <RadialProgress value={persenKec} size={50} strokeWidth={5} />
            <div>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider font-semibold">
                Kecamatan {kecamatan}
              </p>
              <h3 className="text-sm font-bold text-text-primary dark:text-dark-text-primary">
                {survei?.nama_survei}
              </h3>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                Realisasi: <strong className="text-text-primary dark:text-dark-text-primary font-mono">{totalSelesai}</strong> dari <strong className="text-text-primary dark:text-dark-text-primary font-mono">{totalTarget}</strong> sampel ({persenKec}%) · {items.length} tugas
              </p>
            </div>
          </div>

          {/* Search bar inside modal */}
          <div className="relative w-full sm:w-56">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari petugas / desa..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-bg-page dark:bg-dark-bg-page border border-border-soft dark:border-dark-border-soft text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
        </div>

        {/* Tabel Ringkas 6 Kolom */}
        <div className="overflow-x-auto rounded-xl border border-border-soft dark:border-dark-border-soft max-h-[55vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface dark:bg-dark-surface shadow-sm z-10">
              <tr className="bg-navy/4 dark:bg-dark-navy/8 border-b border-border-soft dark:border-dark-border-soft">
                {['Petugas', 'Periode', 'Desa / Kelurahan', 'Progres', 'Deadline', 'Catatan'].map((h) => (
                  <th
                    key={h}
                    className="px-3.5 py-2.5 text-center text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft dark:divide-dark-border-soft">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
                    {search ? 'Tidak ada tugas yang cocok dengan pencarian.' : 'Belum ada data tugas untuk kecamatan ini.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => {
                  const persen = parseFloat(row.persen) || 0;
                  let periodeLabel = String(row.tahun);
                  if (row.jenis_periode === 'mingguan')   periodeLabel += ` / Mggu ${row.minggu_ke} Bln ${row.bulan}`;
                  else if (row.jenis_periode === 'bulanan') periodeLabel += ` / Bln ${row.bulan}`;
                  else if (row.jenis_periode === 'triwulanan') periodeLabel += ` / TW ${row.triwulan_ke}`;

                  const isLate = row.deadline && new Date(row.deadline) < new Date() && persen < 100;

                  return (
                    <tr key={row.id} className="hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-colors">
                      {/* 1. Petugas */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text-primary dark:text-dark-text-primary text-xs">
                            {row.nama_petugas}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${row.tipe_petugas === 'pegawai' ? 'bg-navy/8 text-navy dark:bg-dark-navy/15 dark:text-dark-navy' : 'bg-accent-orange/8 text-accent-orange dark:bg-dark-accent-orange/15 dark:text-dark-accent-orange'}`}>
                            {row.tipe_petugas}
                          </span>
                        </div>
                      </td>

                      {/* 2. Periode */}
                      <td className="px-3.5 py-2.5 font-mono text-xs text-text-secondary dark:text-dark-text-secondary whitespace-nowrap text-center">
                        {periodeLabel}
                      </td>

                      {/* 3. Desa / Kelurahan */}
                      <td className="px-3.5 py-2.5 text-xs text-text-primary dark:text-dark-text-primary whitespace-nowrap font-medium">
                        {row.desa_kelurahan}
                      </td>

                      {/* 4. Progres */}
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-xs font-semibold tabular-nums text-text-primary dark:text-dark-text-primary min-w-8 text-right">
                            {row.sampel_selesai}/{row.target_sampel}
                          </span>
                          <div className="w-12 h-1.5 rounded-full bg-status-neutral/15 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${persen >= 100 ? 'bg-navy dark:bg-dark-navy' : persen > 0 ? 'bg-accent-orange dark:bg-dark-accent-orange' : 'bg-status-neutral dark:bg-dark-status-neutral'}`}
                              style={{ width: `${Math.min(100, persen)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono tabular-nums text-text-secondary dark:text-dark-text-secondary w-7 text-right">
                            {persen}%
                          </span>
                        </div>
                      </td>

                      {/* 5. Deadline */}
                      <td className={`px-3.5 py-2.5 text-xs font-mono whitespace-nowrap text-center ${isLate ? 'text-accent-orange dark:text-dark-accent-orange font-semibold' : 'text-text-secondary dark:text-dark-text-secondary'}`}>
                        {isLate && '⚠ '}{row.deadline || '—'}
                      </td>

                      {/* 6. Catatan */}
                      <td className="px-3.5 py-2.5 text-xs min-w-[120px] max-w-[180px]">
                        {row.catatan ? (
                          <span className="text-text-primary dark:text-dark-text-primary line-clamp-2" title={row.catatan}>
                            {row.catatan}
                          </span>
                        ) : (
                          <span className="text-text-secondary/50 dark:text-dark-text-secondary/50 italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
