import { useState, useEffect } from 'react';
import RadialProgress from '../ui/RadialProgress';
import Pagination from '../ui/Pagination';

/**
 * ProgressTable — Tabel progres per kecamatan/desa.
 *
 * Props:
 * - data: Array<{ label, total_tugas, total_target, total_selesai, persen }>
 * - loading: bool
 * - title: string
 */
export default function ProgressTable({ data = [], loading = false, title = 'Progres per Wilayah' }) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Reset page saat data berubah (misal ganti filter tahun/bulan/mode)
  useEffect(() => {
    setPage(1);
  }, [data, perPage]);

  const isAll = perPage === 'all';
  const effectivePerPage = isAll ? (data.length || 1) : Number(perPage);
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(data.length / effectivePerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = isAll ? 0 : (safePage - 1) * effectivePerPage;
  const endIndex = isAll ? data.length : Math.min(startIndex + effectivePerPage, data.length);
  const paginatedData = isAll ? data : data.slice(startIndex, endIndex);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border-soft dark:border-dark-border-soft pb-3">
        <h2 className="font-heading font-semibold text-sm text-text-primary dark:text-dark-text-primary">
          {title}
        </h2>
        <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
          Total {data.length} entri
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border-soft dark:border-dark-border-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy/4 dark:bg-dark-navy/8">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                Nama
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                Tugas
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                Target
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                Selesai
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide w-32">
                Progres
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border-soft dark:border-dark-border-soft">
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-5 py-3">
                      <div className="h-3 rounded-full bg-status-neutral/15 animate-pulse" style={{ width: `${40 + j * 12}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
                  Belum ada data.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => {
                const persen = parseFloat(row.persen) || 0;
                return (
                  <tr key={i} className="border-t border-border-soft dark:border-dark-border-soft hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-colors">
                    <td className="px-5 py-3 font-medium text-text-primary dark:text-dark-text-primary">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary dark:text-dark-text-secondary">
                      {row.total_tugas}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-primary dark:text-dark-text-primary">
                      {row.total_target}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-primary dark:text-dark-text-primary">
                      {row.total_selesai}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Inline bar */}
                        <div className="flex-1 h-1.5 rounded-full bg-status-neutral/15 dark:bg-dark-status-neutral/20 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              persen >= 100 ? 'bg-navy dark:bg-dark-navy'
                              : persen > 0  ? 'bg-accent-orange dark:bg-dark-accent-orange'
                              : 'bg-status-neutral dark:bg-dark-status-neutral'
                            }`}
                            style={{ width: `${Math.min(100, persen)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono tabular-nums text-text-secondary dark:text-dark-text-secondary w-10 text-right">
                          {persen}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && (
        <Pagination
          totalItems={data.length}
          page={page}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          label="wilayah"
        />
      )}
    </div>
  );
}

