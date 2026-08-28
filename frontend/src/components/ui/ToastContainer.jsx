import { useEffect, useState } from 'react';

function ToastItem({ toast, onRemove }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 4000;
    const intervalTime = 20;
    const decrement = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(timer);
          onRemove(toast.id);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [toast, onRemove]);

  // Config per type
  let icon = null;
  let badgeClass = '';
  let borderAccent = '';
  let progressColor = '';
  let titleColor = '';

  switch (toast.type) {
    case 'error':
      badgeClass = 'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400 border border-red-200 dark:border-red-800/60';
      borderAccent = 'border-l-4 border-l-red-500 dark:border-l-red-500';
      progressColor = 'bg-red-500 dark:bg-red-400';
      titleColor = 'text-red-700 dark:text-red-400';
      icon = (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      );
      break;

    case 'warning':
      badgeClass = 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60';
      borderAccent = 'border-l-4 border-l-amber-500 dark:border-l-amber-500';
      progressColor = 'bg-amber-500 dark:bg-amber-400';
      titleColor = 'text-amber-700 dark:text-amber-400';
      icon = (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      );
      break;

    case 'info':
      badgeClass = 'bg-blue-100 text-navy dark:bg-blue-950/70 dark:text-dark-navy border border-blue-200 dark:border-blue-800/60';
      borderAccent = 'border-l-4 border-l-navy dark:border-l-dark-navy';
      progressColor = 'bg-navy dark:bg-dark-navy';
      titleColor = 'text-navy dark:text-dark-navy';
      icon = (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      );
      break;

    case 'success':
    default:
      badgeClass = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60';
      borderAccent = 'border-l-4 border-l-emerald-500 dark:border-l-emerald-500';
      progressColor = 'bg-emerald-500 dark:bg-emerald-400';
      titleColor = 'text-emerald-700 dark:text-emerald-400';
      icon = (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
      break;
  }

  return (
    <div
      role="alert"
      className={`relative overflow-hidden w-full rounded-2xl bg-surface dark:bg-dark-surface border border-border-soft dark:border-dark-border-soft shadow-2xl p-4 transition-all duration-200 flex items-start gap-3.5 ${borderAccent} pointer-events-auto`}
    >
      {/* Icon Badge */}
      <div className={`p-2 rounded-xl flex-shrink-0 ${badgeClass}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2 pt-0.5">
        {toast.title && (
          <h4 className={`text-xs font-bold uppercase tracking-wider ${titleColor} mb-0.5`}>
            {toast.title}
          </h4>
        )}
        <p className="text-xs font-medium text-text-primary dark:text-dark-text-primary leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        aria-label="Tutup notifikasi"
        className="p-1.5 -mr-1 -mt-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-slate-800 transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress Bar Timer */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full transition-all linear ${progressColor}`}
          style={{ width: `${progress}%`, transitionDuration: '20ms' }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
