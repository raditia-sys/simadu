import { useState, useCallback } from 'react';
import { useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'simadu_col_vis_';

/**
 * useColumnVisibility — manage which columns are visible.
 *
 * @param tableId  unique ID for localStorage key (e.g. 'tugas')
 * @param allCols  Array<{ key, label, alwaysVisible? }>
 * @returns { visible, toggle, toggleAll, reset }
 */
export function useColumnVisibility(tableId, allCols) {
  const storageKey = STORAGE_KEY_PREFIX + tableId;

  const defaultVisible = () => {
    const initial = Object.fromEntries(
      allCols.map((c) => [c.key, c.defaultVisible !== undefined ? Boolean(c.defaultVisible) : true])
    );
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return { ...initial, ...parsed };
        }
      } catch { /* ignore */ }
    }
    return initial;
  };

  const [visible, setVisible] = useState(defaultVisible);

  // Sync ke localStorage setiap kali visible berubah
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(visible));
  }, [visible, storageKey]);

  const toggle = useCallback((key) => {
    const col = allCols.find((c) => c.key === key);
    if (col?.alwaysVisible) return; // kolom terkunci tidak bisa di-toggle
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }, [allCols]);

  const reset = useCallback(() => {
    setVisible(
      Object.fromEntries(
        allCols.map((c) => [c.key, c.defaultVisible !== undefined ? Boolean(c.defaultVisible) : true])
      )
    );
  }, [allCols]);

  return { visible, toggle, reset };
}
