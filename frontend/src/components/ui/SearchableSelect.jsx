import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * SearchableSelect - Dropdown dengan fitur pencarian teks di dalamnya.
 * 
 * Props:
 * - options: Array<{ value, label }>
 * - value: string | number
 * - onChange: (val) => void
 * - placeholder: string
 * - className: string
 */
export default function SearchableSelect({ options = [], value, onChange, placeholder = "-- Pilih --", className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  
  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-sm border transition-all text-left
          bg-bg-page dark:bg-dark-bg-page border-border-soft dark:border-dark-border-soft 
          focus:outline-none focus:ring-2 focus:ring-navy/40 dark:focus:ring-dark-navy/40
          ${selectedOption ? 'text-text-primary dark:text-dark-text-primary' : 'text-text-secondary/60 dark:text-dark-text-secondary/60'}
        `}
      >
        <span className="truncate">{displayLabel}</span>
        <svg className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''} flex-shrink-0 ml-2`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 rounded-xl border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface shadow-soft-lg animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-72">
          
          {/* Search Input Box */}
          <div className="p-2 flex-shrink-0 border-b border-border-soft dark:border-dark-border-soft">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <svg className="w-3.5 h-3.5 text-text-secondary dark:text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <input
                type="text"
                autoFocus
                placeholder="Ketik untuk mencari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm bg-bg-page dark:bg-dark-bg-page border border-border-soft dark:border-dark-border-soft text-text-primary dark:text-dark-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-navy dark:focus:border-dark-navy transition-colors"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-sm transition-colors
                    ${String(value) === String(opt.value) 
                      ? 'bg-navy/10 dark:bg-dark-navy/20 text-navy dark:text-dark-navy font-medium' 
                      : 'text-text-primary dark:text-dark-text-primary hover:bg-navy/5 dark:hover:bg-dark-navy/10'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="px-3.5 py-3 text-sm text-text-secondary text-center">
                Pencarian tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
