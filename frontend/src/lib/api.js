/**
 * api.js — Thin wrapper untuk fetch ke backend PHP.
 *
 * Semua request dikirim ke /api/* yang akan di-proxy Vite ke simadu.test/backend/api/*
 * credentials: 'include' → session cookie ikut dikirim (penting untuk auth)
 */

const BASE = '/api';

async function request(method, path, body) {
  const options = {
    method,
    credentials: 'include',           // kirim session cookie di setiap request
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(BASE + path, options);
    const json = await res.json().catch(() => ({
      success: false,
      data: null,
      message: `HTTP ${res.status} — respons tidak valid`,
    }));

    // Jika server mengembalikan 401 dan bukan dari endpoint /auth,
    // kirim event agar redirect ke /login ditangani oleh AuthContext.
    if (res.status === 401 && !path.startsWith('/auth')) {
      window.dispatchEvent(new Event('simadu:unauthorized'));
    }

    return { ...json, status: res.status, ok: res.ok };
  } catch (err) {
    return {
      success: false,
      data: null,
      message: 'Gagal terhubung ke server. Periksa koneksi jaringan atau server backend.',
      status: 0,
      ok: false,
    };
  }
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path, body)  => request('DELETE', path, body),
};
