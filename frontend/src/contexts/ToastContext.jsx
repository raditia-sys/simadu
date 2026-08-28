import { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/ui/ToastContainer';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', title = '', duration = 4000) => {
    if (!message) return;
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    let defaultTitle = '';
    if (!title) {
      switch (type) {
        case 'success': defaultTitle = 'Berhasil'; break;
        case 'error':   defaultTitle = 'Gagal'; break;
        case 'warning': defaultTitle = 'Peringatan'; break;
        case 'info':    defaultTitle = 'Informasi'; break;
        default:        defaultTitle = 'Notifikasi';
      }
    }

    const newToast = {
      id,
      message,
      type,
      title: title || defaultTitle,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  // Helpers
  const showToast = useCallback((msg, type = 'success', title = '', duration = 4000) => {
    addToast(msg, type, title, duration);
  }, [addToast]);

  const toastHelpers = {
    show:    (msg, type, title, dur) => addToast(msg, type || 'success', title, dur),
    success: (msg, title, dur) => addToast(msg, 'success', title, dur),
    error:   (msg, title, dur) => addToast(msg, 'error', title, dur),
    warning: (msg, title, dur) => addToast(msg, 'warning', title, dur),
    info:    (msg, title, dur) => addToast(msg, 'info', title, dur),
  };

  return (
    <ToastContext.Provider value={{ showToast, toast: toastHelpers, removeToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  return ctx;
}
