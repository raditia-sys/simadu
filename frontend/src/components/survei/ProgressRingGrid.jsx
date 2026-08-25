import RadialProgress from '../ui/RadialProgress';

/**
 * ProgressRingGrid — Grid radial progress ring per kecamatan/desa.
 *
 * Props:
 * - items: Array<{ label, persen, total_target, total_selesai, total_tugas }>
 * - title: string
 * - loading: bool
 * - drillLabel: string | null  (kecamatan yang sedang di-drill)
 * - onDrill: (label) => void   (klik kecamatan untuk drill ke desa)
 * - onBack: () => void
 */
export default function ProgressRingGrid({
  items = [],
  title = 'Progres per Kecamatan',
  loading = false,
  drillLabel = null,
  onDrill,
  onBack,
}) {
  // Ringkasan total dari semua items
  const totalTarget  = items.reduce((s, r) => s + (parseInt(r.total_target) || 0), 0);
  const totalSelesai = items.reduce((s, r) => s + (parseInt(r.total_selesai) || 0), 0);
  const persenOverall = totalTarget > 0 ? Math.round((totalSelesai / totalTarget) * 100) : 0;

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        {drillLabel && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-navy/8 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/15 transition-all flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-semibold text-sm text-text-primary dark:text-dark-text-primary">
            {title}
          </h2>
          {drillLabel && (
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
              Kecamatan {drillLabel} · klik kecamatan untuk kembali
            </p>
          )}
        </div>

        {/* Total ring kecil di kanan */}
        {!loading && items.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <RadialProgress value={persenOverall} size={48} strokeWidth={5} />
            <div>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Total</p>
              <p className="text-sm font-mono font-semibold text-text-primary dark:text-dark-text-primary">
                {totalSelesai}/{totalTarget}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid rings */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-status-neutral/15 animate-pulse" />
              <div className="h-3 w-16 rounded-full bg-status-neutral/10 animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            Belum ada data untuk periode ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((item, i) => {
            const persen = parseFloat(item.persen) || 0;
            const isDrillable = !drillLabel && typeof onDrill === 'function';

            return (
              <button
                key={i}
                onClick={isDrillable ? () => onDrill(item.label) : undefined}
                disabled={!isDrillable}
                className={`
                  group flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-left
                  border-border-soft dark:border-dark-border-soft
                  ${isDrillable
                    ? 'hover:border-navy/30 hover:bg-navy/3 dark:hover:border-dark-navy/40 dark:hover:bg-dark-navy/6 cursor-pointer'
                    : 'cursor-default'
                  }
                `}
                title={isDrillable ? `Lihat detail ${item.label}` : item.label}
              >
                <RadialProgress value={persen} size={60} strokeWidth={5} />
                <div className="text-center w-full">
                  <p className="text-xs font-medium text-text-primary dark:text-dark-text-primary leading-tight truncate w-full">
                    {item.label}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary font-mono mt-0.5">
                    {item.total_selesai}/{item.total_target}
                  </p>
                  {item.total_tugas && (
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                      {item.total_tugas} tugas
                    </p>
                  )}
                </div>
                {isDrillable && (
                  <span className="text-xs text-navy/60 dark:text-dark-navy/60 group-hover:text-navy dark:group-hover:text-dark-navy font-medium transition-colors">
                    Lihat tugas →
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
