/**
 * ConfirmDialog — dialog konfirmasi untuk aksi destruktif (hapus data).
 *
 * Props:
 * - isOpen: bool
 * - onConfirm: fn — dipanggil saat user klik tombol konfirmasi
 * - onCancel: fn — dipanggil saat user klik batal atau overlay
 * - title: string
 * - message: string | ReactNode
 * - confirmLabel: string (default: 'Hapus')
 * - loading: bool — nonaktifkan tombol saat proses berjalan
 */
export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Konfirmasi Hapus',
  message = 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.',
  confirmLabel = 'Hapus',
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-sm card shadow-soft-lg p-6 space-y-4">
        {/* Icon */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent-orange/10 dark:bg-dark-accent-orange/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent-orange dark:text-dark-accent-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-text-primary dark:text-dark-text-primary">
              {title}
            </h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white
                       bg-accent-orange dark:bg-dark-accent-orange shadow-soft-sm
                       hover:brightness-105 active:scale-[0.98] transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
