import { useState, useRef, useEffect } from 'react';

/**
 * ColumnSelector — dropdown checklist untuk memilih kolom yang ditampilkan.
 *
 * Props:
 * - columns: Array<{ key, label, alwaysVisible? }>
 * - visible: { [key]: bool }
 * - onToggle: (key) => void
 * - onReset: () => void
 */
export default function ColumnSelector({ columns, visible, onToggle, onReset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visibleCount = Object.values(visible).filter(Boolean).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Pilih kolom yang ditampilkan"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all
          ${open
            ? 'border-navy/30 bg-navy/8 text-navy dark:border-dark-navy/40 dark:bg-dark-navy/15 dark:text-dark-navy'
            : 'border-border-soft bg-surface text-text-secondary hover:text-text-primary hover:border-navy/20 dark:border-dark-border-soft dark:bg-dark-surface dark:text-dark-text-secondary dark:hover:text-dark-text-primary'
          }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
        <span>Kolom</span>
        <span className="text-xs bg-navy/10 dark:bg-dark-navy/20 text-navy dark:text-dark-navy px-1.5 py-0.5 rounded-full font-mono">
          {visibleCount}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-40 w-56 card shadow-soft-lg py-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-soft dark:border-dark-border-soft mb-1">
            <span className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
              Tampilkan Kolom
            </span>
            <button
              onClick={onReset}
              className="text-xs text-navy dark:text-dark-navy hover:underline"
            >
              Reset
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {columns.map((col) => {
              const isLocked = col.alwaysVisible;
              const isChecked = visible[col.key] ?? true;
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors
                    ${isLocked
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-navy/4 dark:hover:bg-dark-navy/8'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isLocked}
                    onChange={() => onToggle(col.key)}
                    className="w-3.5 h-3.5 rounded accent-navy"
                  />
                  <span className="text-sm text-text-primary dark:text-dark-text-primary truncate">
                    {col.label}
                  </span>
                  {isLocked && (
                    <svg className="w-3 h-3 ml-auto flex-shrink-0 text-text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
