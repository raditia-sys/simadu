import { useState } from 'react';

const HARI  = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
               'Juli','Agustus','September','Oktober','November','Desember'];

/**
 * MiniCalendar — kalender bulanan kecil untuk Dasbor.
 *
 * Props:
 * - deadlineDates: string[] — array tanggal 'YYYY-MM-DD' yang punya deadline
 * - onMonthChange: fn(year, month) — 1-indexed
 */
export default function MiniCalendar({ deadlineDates = [], onMonthChange }) {
  const today = new Date();
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() }); // 0-indexed

  // Set dari tanggal deadline (format 'YYYY-MM-DD')
  const deadlineSet = new Set(deadlineDates);

  // Navigasi bulan
  const prev = () => {
    const d = new Date(cur.year, cur.month - 1, 1);
    const next = { year: d.getFullYear(), month: d.getMonth() };
    setCur(next);
    onMonthChange?.(next.year, next.month + 1);
  };
  const next = () => {
    const d = new Date(cur.year, cur.month + 1, 1);
    const nextM = { year: d.getFullYear(), month: d.getMonth() };
    setCur(nextM);
    onMonthChange?.(nextM.year, nextM.month + 1);
  };

  // Hitung hari-hari dalam grid
  const firstDay = new Date(cur.year, cur.month, 1).getDay(); // 0=Min
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="card p-5">
      {/* Header navigasi */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-sm text-text-primary dark:text-dark-text-primary">
          {BULAN[cur.month]} {cur.year}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={prev}
            className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-navy/6 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button onClick={() => {
            const r = { year: today.getFullYear(), month: today.getMonth() };
            setCur(r); onMonthChange?.(r.year, r.month + 1);
          }}
            className="px-2 py-0.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-navy/6 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10 transition-all">
            Hari ini
          </button>
          <button onClick={next}
            className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-navy/6 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Nama hari */}
      <div className="grid grid-cols-7 mb-1">
        {HARI.map((h) => (
          <div key={h} className="text-center text-xs font-medium text-text-secondary dark:text-dark-text-secondary py-1">
            {h}
          </div>
        ))}
      </div>

      {/* Grid tanggal */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const dateStr = `${cur.year}-${String(cur.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday    = dateStr === todayStr;
          const hasDeadline = deadlineSet.has(dateStr);

          return (
            <div key={dateStr} className="relative flex items-center justify-center">
              <span className={`
                w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all
                ${isToday
                  ? 'bg-navy text-white dark:bg-dark-navy font-semibold'
                  : 'text-text-primary dark:text-dark-text-primary hover:bg-navy/8 dark:hover:bg-dark-navy/15'
                }
              `}>
                {day}
              </span>
              {/* Dot untuk deadline */}
              {hasDeadline && !isToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-orange dark:bg-dark-accent-orange" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {deadlineSet.size > 0 && (
        <div className="mt-3 pt-3 border-t border-border-soft dark:border-dark-border-soft flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-orange dark:bg-dark-accent-orange flex-shrink-0" />
          <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
            {deadlineSet.size} deadline bulan ini
          </span>
        </div>
      )}
    </div>
  );
}
