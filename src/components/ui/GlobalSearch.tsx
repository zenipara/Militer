import { ICONS } from '../../icons';
import { useState, useEffect, useCallback, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import { searchAll, type SearchResult as ApiSearchResult } from '../../lib/api/search';
import { readSessionContext } from '../../lib/sessionContext';
import { useAuthStore } from '../../store/authStore';
import { useDebounce } from '../../hooks/useDebounce';
import { handleError } from '../../lib/handleError';

interface SearchResult extends ApiSearchResult {
  href: string;
  icon: keyof typeof ICONS;
}

function buildHref(result: ApiSearchResult): string {
  const role = result.role;
  if (result.type === 'task') {
    return role === 'prajurit' ? '/prajurit/tasks' : '/komandan/tasks';
  }
  if (result.type === 'user') {
    return role === 'admin' ? '/admin/users' : '/komandan/personnel';
  }
  // announcement
  return role === 'admin' ? '/admin/announcements' : `/${role}/dashboard`;
}

const TYPE_ICON: Record<ApiSearchResult['type'], keyof typeof ICONS> = {
  task: 'ClipboardCheck',
  user: 'Users',
  announcement: 'Megaphone',
};

export default function GlobalSearch() {
  const { user } = useAuthStore();
  const sessionContext = readSessionContext();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const query = useDebounce(rawQuery, 300);

  const activeRole = user?.role ?? sessionContext?.role;

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !activeRole) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const apiResults = await searchAll({ query: q, callerRole: activeRole });
      setResults(
        apiResults.map((r) => ({
          ...r,
          href: buildHref(r),
          icon: TYPE_ICON[r.type],
        })),
      );
    } catch (err) {
      if (import.meta.env.DEV) console.error(handleError(err, 'Gagal mencari data'));
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeRole]);

  useEffect(() => {
    void search(query);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setRawQuery('');
    setResults([]);
    navigate(result.href);
  };

  return (
    <div ref={containerRef} className="relative" data-print-hide>
      {/* Search trigger button */}
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 rounded-xl border border-surface bg-slate-50 px-3 py-2 text-sm text-text-muted transition-colors hover:bg-slate-100 hover:text-text-primary dark:bg-surface/35 dark:hover:bg-surface/65"
        aria-label="Cari (Ctrl+K)"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <span className="hidden sm:block">Cari...</span>
        <kbd className="hidden rounded border border-surface bg-white px-1.5 py-0.5 text-[10px] sm:block dark:bg-bg-card">⌃K</kbd>
      </button>

      {/* Search modal/dropdown */}
      {isOpen && (
        <div className="app-panel absolute right-0 top-full z-50 mt-2 w-[min(92vw,460px)] overflow-hidden rounded-2xl animate-slide-in">
          {/* Input */}
          <div className="flex items-center gap-2 border-b border-surface/80 px-4 py-3">
            <svg className="h-4 w-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Cari tugas, personel, pengumuman..."
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              autoFocus
            />
            {isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-primary flex-shrink-0" />
            )}
            <button onClick={() => setIsOpen(false)} className="text-xs text-text-muted hover:text-text-primary">
              Esc
            </button>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {rawQuery && results.length === 0 && !isLoading && (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                Tidak ada hasil untuk &ldquo;{rawQuery}&rdquo;
              </p>
            )}
            {!rawQuery && (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                Ketik untuk mencari tugas, personel, atau pengumuman
              </p>
            )}
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-surface/55"
              >
                <span className="text-lg flex-shrink-0">{
                  (() => {
                    const Icon = ICONS[r.icon];
                    return Icon ? <Icon className="w-5 h-5" aria-hidden="true" /> : null;
                  })()
                }</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{r.subtitle}</p>
                </div>
              </button>
            ))}
          </div>

          {results.length > 0 && (
            <div className="border-t border-surface/80 px-4 py-2 text-center text-xs text-text-muted">
              {results.length} hasil — klik untuk navigasi
            </div>
          )}
        </div>
      )}
    </div>
  );
}

