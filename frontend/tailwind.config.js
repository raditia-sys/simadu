/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Toggle dark mode via class on <html> element

  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      // ─── Color Design Tokens (Bagian 4) ──────────────────────────────────────
      colors: {
        // ── Light Mode ──
        // Navy (primary): header, sidebar, buttons, status "Selesai"
        'navy':           '#3E5C7E',
        // Orange (accent): CTA, highlights, active elements, status "Berjalan"
        'accent-orange':  '#E8935A',
        // Gray neutral: status "Belum Mulai"
        'status-neutral': '#C3CBD3',
        // Page background (warm white, not stark white)
        'bg-page':        '#FAF9F7',
        // Card / surface
        'surface':        '#FFFFFF',
        // Text
        'text-primary':   '#2A3540',
        'text-secondary': '#7C8A9A',
        // Border / divider
        'border-soft':    '#E7E5E1',

        // ── Dark Mode ──
        'dark-bg-page':        '#1B2733',
        'dark-surface':        '#243544',
        'dark-navy':           '#6E8CAC', // lighter navy, readable on dark bg
        'dark-accent-orange':  '#E8A272', // muted orange, not neon
        'dark-status-neutral': '#4E5D6C',
        'dark-text-primary':   '#D8DEE6',
        'dark-text-secondary': '#93A2B0',
        'dark-border-soft':    '#33455A',
      },

      // ─── Typography ───────────────────────────────────────────────────────────
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body:    ['"Inter"',         'sans-serif'],
        mono:    ['"JetBrains Mono"','monospace'],
      },

      // ─── Shadows (soft/blur-heavy — Bagian 4 principle) ──────────────────────
      boxShadow: {
        'soft-sm': '0 1px 8px 0 rgba(62, 92, 126, 0.06)',
        'soft':    '0 4px 24px 0 rgba(62, 92, 126, 0.08)',
        'soft-lg': '0 8px 40px 0 rgba(62, 92, 126, 0.10)',
      },

      // ─── Border Radius ────────────────────────────────────────────────────────
      borderRadius: {
        'xl':  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },

      // ─── Animation ────────────────────────────────────────────────────────────
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },

  plugins: [],
};
