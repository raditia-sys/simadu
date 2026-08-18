import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

/**
 * AuthProvider — bungkus seluruh app.
 *
 * State:
 * - user: null (belum login) | { id, nama, username, role }
 * - loading: true saat pertama kali cek sesi
 *
 * Fungsi:
 * - login(username, password) → return { ok, message }
 * - logout()
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Cek sesi aktif saat app pertama kali load
  useEffect(() => {
    api.get('/me')
      .then((res) => {
        if (res.success) setUser(res.data);
      })
      .catch(() => {}) // jaringan error → anggap belum login
      .finally(() => setLoading(false));
  }, []);

  // Listen event 401 dari api.js → logout paksa
  useEffect(() => {
    const handle = () => setUser(null);
    window.addEventListener('simadu:unauthorized', handle);
    return () => window.removeEventListener('simadu:unauthorized', handle);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.success) {
      setUser(res.data);
    }
    return { ok: res.success, message: res.message };
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook untuk konsumsi auth context */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
