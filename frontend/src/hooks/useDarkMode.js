import { useState, useCallback } from 'react';

/**
 * useDarkMode — manages dark/light mode for SIMADU.
 *
 * Design decisions:
 * - Initial state is computed ONCE from localStorage / system preference.
 *   The actual DOM class is applied in main.jsx BEFORE React renders, so
 *   there is NO flash and NO useEffect needed here.
 * - Toggle mutates document.documentElement.classList directly and persists
 *   to localStorage. This is intentional — no reactive DOM side effects via
 *   useEffect to avoid the "toggle breaks on re-render" bug.
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('simadu-dark-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      // Directly mutate DOM — authoritative source of truth for CSS
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Persist preference
      localStorage.setItem('simadu-dark-mode', String(next));
      return next;
    });
  }, []);

  return { isDark, toggle };
}
