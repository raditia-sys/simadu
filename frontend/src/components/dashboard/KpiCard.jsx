import RadialProgress from '../ui/RadialProgress';

/**
 * KpiCard — Kartu ringkasan angka untuk Dasbor.
 *
 * Props:
 * - label: string
 * - value: number | string
 * - sub: string (keterangan kecil di bawah value)
 * - icon: JSX element
 * - variant: 'neutral' | 'berjalan' | 'selesai' | 'persen'
 * - loading: bool
 */
export function KpiCard({ label, value, sub, icon, variant = 'neutral', loading = false }) {
  const colorMap = {
    neutral:  'text-status-neutral dark:text-dark-status-neutral bg-status-neutral/8 dark:bg-dark-status-neutral/10',
    berjalan: 'text-accent-orange dark:text-dark-accent-orange bg-accent-orange/8 dark:bg-dark-accent-orange/10',
    selesai:  'text-navy dark:text-dark-navy bg-navy/8 dark:bg-dark-navy/10',
    persen:   'text-navy dark:text-dark-navy bg-navy/8 dark:bg-dark-navy/10',
  };

  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl flex-shrink-0 ${colorMap[variant]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide truncate">
          {label}
        </p>
        {loading ? (
          <div className="mt-1.5 h-7 w-16 rounded-lg bg-status-neutral/15 animate-pulse" />
        ) : (
          <p className="mt-0.5 text-2xl font-heading font-bold text-text-primary dark:text-dark-text-primary tabular-nums">
            {value}
          </p>
        )}
        {sub && (
          <p className="mt-0.5 text-xs text-text-secondary dark:text-dark-text-secondary truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

/**
 * KpiCardPersen — Versi dengan RadialProgress di kanan.
 */
export function KpiCardPersen({ label, value, sub, loading = false }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide truncate">
          {label}
        </p>
        {loading ? (
          <div className="mt-1.5 h-7 w-16 rounded-lg bg-status-neutral/15 animate-pulse" />
        ) : (
          <p className="mt-0.5 text-2xl font-heading font-bold text-text-primary dark:text-dark-text-primary tabular-nums">
            {value}%
          </p>
        )}
        {sub && (
          <p className="mt-0.5 text-xs text-text-secondary dark:text-dark-text-secondary">{sub}</p>
        )}
      </div>
      {!loading && (
        <RadialProgress value={parseFloat(value) || 0} size={56} strokeWidth={5} />
      )}
    </div>
  );
}
