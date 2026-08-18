import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// ─── Apply dark mode BEFORE React renders (prevents flash of wrong theme) ────
// We read from localStorage, and fall back to system preference.
// This runs synchronously — no useEffect, no flash.
(function initDarkMode() {
  const saved = localStorage.getItem('simadu-dark-mode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === 'true' : prefersDark;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
