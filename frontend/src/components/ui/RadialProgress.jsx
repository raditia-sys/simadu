/**
 * RadialProgress — Signature visual element SIMADU.
 *
 * SVG circular progress ring dengan warna otomatis berdasarkan nilai:
 * - 0%       → abu-abu netral (status-neutral)
 * - 1–99%    → oranye (accent-orange)
 * - 100%     → navy
 *
 * Props:
 * - value: 0–100 (number)
 * - size: pixel size (default 64)
 * - strokeWidth: ketebalan ring (default 6)
 * - showLabel: tampilkan persen di tengah (default true)
 * - className: tambahan class wrapper
 */
export default function RadialProgress({
  value = 0,
  size = 64,
  strokeWidth = 6,
  showLabel = true,
  className = '',
}) {
  const clampedValue = Math.max(0, Math.min(100, Math.round(value)));
  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset       = circumference - (clampedValue / 100) * circumference;

  // Warna berdasarkan nilai — menggunakan token design system
  let colorClass, trackClass;
  if (clampedValue === 0) {
    colorClass = 'text-status-neutral dark:text-dark-status-neutral';
    trackClass = 'text-status-neutral/20 dark:text-dark-status-neutral/15';
  } else if (clampedValue >= 100) {
    colorClass = 'text-navy dark:text-dark-navy';
    trackClass = 'text-navy/15 dark:text-dark-navy/20';
  } else {
    colorClass = 'text-accent-orange dark:text-dark-accent-orange';
    trackClass = 'text-accent-orange/15 dark:text-dark-accent-orange/20';
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track (background ring) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={`${trackClass} stroke-current`}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${colorClass} stroke-current transition-all duration-500 ease-out`}
        />
      </svg>

      {showLabel && (
        <span
          className={`absolute text-center font-mono font-semibold leading-none ${colorClass}`}
          style={{ fontSize: Math.max(9, size * 0.22) }}
        >
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
