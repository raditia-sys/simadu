export default function Pagination({
  totalItems = 0,
  page = 1,
  perPage = 10,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 50, 100, 'all'],
  label = 'data',
  className = '',
}) {
  if (totalItems === 0) return null;

  const isAll = perPage === 'all';
  const effectivePerPage = isAll ? totalItems : Number(perPage);
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / effectivePerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const startIndex = isAll ? 0 : (safePage - 1) * effectivePerPage;
  const endIndex = isAll ? totalItems : Math.min(startIndex + effectivePerPage, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 text-xs text-text-secondary dark:text-dark-text-secondary ${className}`}>
      {/* Kiri: Selector per page & info range data */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span>Tampilkan</span>
          <select
            value={perPage}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              onPerPageChange(val);
            }}
            className="px-2 py-1 rounded-lg text-xs font-semibold border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 cursor-pointer"
          >
            {perPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'Semua' : opt}
              </option>
            ))}
          </select>
          <span>{label}</span>
        </div>

        <span className="hidden sm:inline text-text-secondary/40 dark:text-dark-text-secondary/40">|</span>

        <div>
          {isAll ? (
            <span>
              Menampilkan semua <strong className="font-semibold text-text-primary dark:text-dark-text-primary">{totalItems}</strong> {label}
            </span>
          ) : (
            <span>
              Menampilkan <strong className="font-semibold text-text-primary dark:text-dark-text-primary">{startIndex + 1}–{endIndex}</strong> dari <strong className="font-semibold text-text-primary dark:text-dark-text-primary">{totalItems}</strong> {label}
            </span>
          )}
        </div>
      </div>

      {/* Kanan: Navigasi tombol halaman */}
      {!isAll && totalPages > 1 && (
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary hover:bg-navy/5 dark:hover:bg-dark-navy/10 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            ← Sebelumnya
          </button>

          {/* Angka halaman */}
          <div className="flex items-center gap-1 px-1">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              if (totalPages > 7) {
                if (p !== 1 && p !== totalPages && Math.abs(p - safePage) > 1) {
                  if (p === 2 || p === totalPages - 1) {
                    return (
                      <span key={p} className="text-xs text-text-secondary px-0.5">
                        ...
                      </span>
                    );
                  }
                  return null;
                }
              }

              const isActive = p === safePage;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`min-w-6 h-6 px-1.5 rounded-md text-xs font-semibold flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-navy text-white dark:bg-dark-navy shadow-xs'
                      : 'text-text-secondary dark:text-dark-text-secondary hover:bg-navy/5 dark:hover:bg-dark-navy/10 hover:text-text-primary'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary hover:bg-navy/5 dark:hover:bg-dark-navy/10 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            Selanjutnya →
          </button>
        </div>
      )}
    </div>
  );
}
