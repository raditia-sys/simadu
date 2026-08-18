/**
 * WizardStepBar — Step indicator 1-2-3 untuk wizard laporan perjalanan dinas.
 *
 * Props:
 *   steps    : string[]  — label tiap langkah
 *   current  : number    — index aktif (0-based)
 *   completed: number[]  — array index yang sudah selesai
 *   onGoTo   : fn(i)     — callback klik step sebelumnya (navigasi mundur)
 */
export default function WizardStepBar({ steps, current, completed = [], onGoTo }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const isDone    = completed.includes(i);
        const isActive  = i === current;
        const isLast    = i === steps.length - 1;
        const canClick  = isDone && !isActive;

        return (
          <div key={i} className="flex items-center flex-1">
            {/* Circle + label */}
            <div className="flex flex-col items-center flex-shrink-0">
              <button
                onClick={() => canClick && onGoTo?.(i)}
                disabled={!canClick}
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-200
                  ${isDone && !isActive
                    ? 'bg-navy dark:bg-dark-navy text-white cursor-pointer hover:scale-105'
                    : isActive
                      ? 'bg-accent-orange dark:bg-dark-accent-orange text-white ring-4 ring-accent-orange/25 dark:ring-dark-accent-orange/25'
                      : 'bg-bg-page dark:bg-dark-bg-page border-2 border-border-soft dark:border-dark-border-soft text-text-secondary dark:text-dark-text-secondary cursor-default'
                  }
                `}
              >
                {isDone && !isActive ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </button>
              <span className={`
                text-xs mt-1.5 font-medium whitespace-nowrap
                ${isActive
                  ? 'text-accent-orange dark:text-dark-accent-orange'
                  : isDone
                    ? 'text-navy dark:text-dark-navy'
                    : 'text-text-secondary dark:text-dark-text-secondary'
                }
              `}>
                {label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className={`
                h-0.5 flex-1 mx-2 mb-5 rounded-full transition-all duration-300
                ${isDone ? 'bg-navy dark:bg-dark-navy' : 'bg-border-soft dark:bg-dark-border-soft'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}
