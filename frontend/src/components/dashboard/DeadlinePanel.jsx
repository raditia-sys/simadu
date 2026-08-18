/**
 * DeadlinePanel — Panel pengingat deadline mendekat.
 * Menampilkan tugas yang deadline-nya dalam N hari ke depan & belum selesai.
 */
const SISA_CLASS = (sisa) => {
  if (sisa < 0)  return 'text-accent-orange dark:text-dark-accent-orange font-semibold';
  if (sisa <= 3) return 'text-accent-orange dark:text-dark-accent-orange';
  return 'text-text-secondary dark:text-dark-text-secondary';
};

const SISA_LABEL = (sisa) => {
  if (sisa < 0)  return `Terlambat ${Math.abs(sisa)} hr`;
  if (sisa === 0) return 'Hari ini';
  return `${sisa} hari lagi`;
};

export default function DeadlinePanel({ items = [], loading = false, maxItems = 8 }) {
  const shown = items.slice(0, maxItems);

  return (
    <div className="card h-full flex flex-col">
      <div className="px-5 pt-5 pb-3 border-b border-border-soft dark:border-dark-border-soft flex items-center justify-between">
        <h2 className="font-heading font-semibold text-sm text-text-primary dark:text-dark-text-primary">
          Pengingat Deadline
        </h2>
        <span className="text-xs text-text-secondary dark:text-dark-text-secondary">7 hari ke depan</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border-soft dark:divide-dark-border-soft">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3 space-y-1.5">
              <div className="h-3 w-4/5 rounded-full bg-status-neutral/15 animate-pulse" />
              <div className="h-2.5 w-1/2 rounded-full bg-status-neutral/10 animate-pulse" />
            </div>
          ))
        ) : shown.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              Tidak ada deadline mendekat dalam 7 hari ke depan.
            </p>
          </div>
        ) : (
          shown.map((item) => {
            const persen = item.persen ?? 0;
            const sisa   = parseInt(item.sisa_hari, 10);
            return (
              <div key={item.id} className="px-5 py-3 hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary dark:text-dark-text-primary leading-tight truncate">
                      {item.nama_survei}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5 truncate">
                      {item.nama_petugas} · {item.desa_kelurahan}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-xs ${SISA_CLASS(sisa)}`}>{SISA_LABEL(sisa)}</p>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5 font-mono">{item.deadline}</p>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-2 h-1 rounded-full bg-status-neutral/15 dark:bg-dark-status-neutral/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      persen >= 100 ? 'bg-navy dark:bg-dark-navy'
                      : persen > 0  ? 'bg-accent-orange dark:bg-dark-accent-orange'
                      : 'bg-status-neutral dark:bg-dark-status-neutral'
                    }`}
                    style={{ width: `${Math.min(100, persen)}%` }}
                  />
                </div>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5 font-mono">
                  {item.sampel_selesai}/{item.target_sampel} ({persen}%)
                </p>
              </div>
            );
          })
        )}
      </div>

      {items.length > maxItems && (
        <div className="px-5 py-2.5 border-t border-border-soft dark:border-dark-border-soft text-center">
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            +{items.length - maxItems} deadline lainnya
          </p>
        </div>
      )}
    </div>
  );
}
