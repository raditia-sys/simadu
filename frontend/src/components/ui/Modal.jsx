import { useEffect, useRef } from 'react';

/**
 * Modal — dialog overlay yang dapat digunakan kembali.
 *
 * Props:
 * - isOpen: bool
 * - onClose: fn
 * - title: string
 * - children: konten form/body
 * - footer: (optional) custom footer element
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 */
export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  const overlayRef = useRef(null);

  // Tutup dengan Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Cegah scroll body saat modal buka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }[size];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div className={`relative w-full ${sizeClass} card shadow-soft-lg max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-soft dark:border-dark-border-soft flex-shrink-0">
          <h2 className="font-heading text-base font-semibold text-text-primary dark:text-dark-text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-navy/5
                       dark:text-dark-text-secondary dark:hover:text-dark-text-primary dark:hover:bg-dark-navy/10
                       transition-all"
            aria-label="Tutup"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border-soft dark:border-dark-border-soft flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * FormField — wrapper untuk label + input dalam form modal.
 */
export function FormField({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary">
        {label}
        {required && <span className="text-accent-orange ml-0.5">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{hint}</p>
      )}
    </div>
  );
}

/**
 * Input — styled text input sesuai design system.
 */
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3.5 py-2 rounded-xl text-sm
        bg-bg-page dark:bg-dark-bg-page
        border border-border-soft dark:border-dark-border-soft
        text-text-primary dark:text-dark-text-primary
        placeholder:text-text-secondary/60 dark:placeholder:text-dark-text-secondary/60
        focus:outline-none focus:ring-2 focus:ring-navy/40 dark:focus:ring-dark-navy/40
        transition-all ${className}`}
      {...props}
    />
  );
}

/**
 * Select — styled select sesuai design system.
 */
export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full px-3.5 py-2 rounded-xl text-sm
        bg-bg-page dark:bg-dark-bg-page
        border border-border-soft dark:border-dark-border-soft
        text-text-primary dark:text-dark-text-primary
        focus:outline-none focus:ring-2 focus:ring-navy/40 dark:focus:ring-dark-navy/40
        transition-all ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Textarea — styled textarea sesuai design system.
 */
export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      rows={3}
      className={`w-full px-3.5 py-2 rounded-xl text-sm resize-none
        bg-bg-page dark:bg-dark-bg-page
        border border-border-soft dark:border-dark-border-soft
        text-text-primary dark:text-dark-text-primary
        placeholder:text-text-secondary/60 dark:placeholder:text-dark-text-secondary/60
        focus:outline-none focus:ring-2 focus:ring-navy/40 dark:focus:ring-dark-navy/40
        transition-all ${className}`}
      {...props}
    />
  );
}
