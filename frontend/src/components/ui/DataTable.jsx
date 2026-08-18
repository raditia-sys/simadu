import { useState } from 'react';

/**
 * DataTable — tabel data reusable dengan search, empty state, loading.
 *
 * Props:
 * - columns: Array<{ key, label, render?: (row) => ReactNode, className?: string }>
 * - data: Array<object>
 * - keyField: string — field unik per row (default: 'id')
 * - loading: bool
 * - onEdit?: (row) => void — jika undefined, tombol edit tidak tampil
 * - onDelete?: (row) => void — jika undefined, tombol delete tidak tampil
 * - searchKeys: string[] — field yang dicari (client-side)
 * - searchPlaceholder: string
 * - emptyMessage: string
 * - actions?: (row) => ReactNode — custom action slot per row
 */
export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  loading = false,
  onEdit,
  onDelete,
  searchKeys = [],
  searchPlaceholder = 'Cari...',
  emptyMessage = 'Belum ada data.',
  actions,
}) {
  const [search, setSearch] = useState('');

  // Filter client-side
  const filtered = search.trim()
    ? data.filter((row) =>
        searchKeys.some((key) =>
          String(row[key] ?? '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  const hasActions = onEdit || onDelete || actions;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      {searchKeys.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary dark:text-dark-text-secondary pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-sm
                bg-bg-page dark:bg-dark-bg-page
                border border-border-soft dark:border-dark-border-soft
                text-text-primary dark:text-dark-text-primary
                placeholder:text-text-secondary/60 dark:placeholder:text-dark-text-secondary/60
                focus:outline-none focus:ring-2 focus:ring-navy/40 dark:focus:ring-dark-navy/40
                transition-all"
            />
          </div>
          {search && (
            <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
              {filtered.length} dari {data.length} data
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border-soft dark:border-dark-border-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy/5 dark:bg-dark-navy/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
              {hasActions && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-border-soft dark:border-dark-border-soft">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-3.5 rounded-full bg-status-neutral/30 dark:bg-dark-status-neutral/20 animate-pulse w-3/4" />
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 py-3">
                      <div className="h-3.5 rounded-full bg-status-neutral/30 dark:bg-dark-status-neutral/20 animate-pulse w-16 ml-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-text-secondary dark:text-dark-text-secondary"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row[keyField]}
                  className="border-t border-border-soft dark:border-dark-border-soft hover:bg-navy/2 dark:hover:bg-dark-navy/5 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-text-primary dark:text-dark-text-primary ${col.className ?? ''}`}>
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {actions && actions(row)}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-text-secondary hover:text-navy hover:bg-navy/8
                                       dark:text-dark-text-secondary dark:hover:text-dark-navy dark:hover:bg-dark-navy/15
                                       transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            title="Hapus"
                            className="p-1.5 rounded-lg text-text-secondary hover:text-accent-orange hover:bg-accent-orange/8
                                       dark:text-dark-text-secondary dark:hover:text-dark-accent-orange dark:hover:bg-dark-accent-orange/15
                                       transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
          Menampilkan {filtered.length} data
          {data.length !== filtered.length ? ` (dari total ${data.length})` : ''}
        </p>
      )}
    </div>
  );
}
