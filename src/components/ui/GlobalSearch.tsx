import { useState, useEffect, useCallback, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useDebounce } from '../../hooks/useDebounce';

interface SearchResult {
  id: string;
  type: 'task' | 'user' | 'announcement';
  title: string;
  subtitle: string;
  href: string;
  icon: keyof typeof ICONS;
}

export default function GlobalSearch() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const query = useDebounce(rawQuery, 300);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !user) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const likeQ = `%${q}%`;

      const [tasksRes, usersRes, announcementsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, judul, status, satuan')
          .or(`judul.ilike.${likeQ},deskripsi.ilike.${likeQ}`)
          .limit(5),
        user.role === 'admin' || user.role === 'komandan'
          ? supabase
              .from('users')
              .select('id, nama, nrp, pangkat, role')
              .or(`nama.ilike.${likeQ},nrp.ilike.${likeQ}`)
              .eq('is_active', true)
              .limit(5)
          : Promise.resolve({ data: [] }),
        supabase
          .from('announcements')
          .select('id, judul, isi')
          .or(`judul.ilike.${likeQ},isi.ilike.${likeQ}`)
          .limit(4),
      ]);

      const combined: SearchResult[] = [
        ...((tasksRes.data ?? []) as { id: string; judul: string; status: string; satuan: string | null }[]).map((t) => ({
          id: t.id,
          type: 'task' as const,
          title: t.judul,
          subtitle: `Status: ${t.status}${t.satuan ? ` · ${t.satuan}` : ''}`,
          href: user.role === 'prajurit' ? '/prajurit/tasks' : '/komandan/tasks',
          icon: 'clipboard',
        })),
        ...((usersRes.data ?? []) as { id: string; nama: string; nrp: string; pangkat: string | null; role: string }[]).map((u) => ({
          id: u.id,
          type: 'user' as const,
          title: u.nama,
          subtitle: `${u.nrp}${u.pangkat ? ` · ${u.pangkat}` : ''} · ${u.role}`,
          href: user.role === 'admin' ? '/admin/users' : '/komandan/personnel',
          icon: 'usersRound',
        })),
        ...((announcementsRes.data ?? []) as { id: string; judul: string; isi: string }[]).map((a) => ({
          id: a.id,
          type: 'announcement' as const,
          title: a.judul,
          subtitle: a.isi.slice(0, 80),
          href: user.role === 'admin' ? '/admin/announcements' : `/${user.role}/dashboard`,
          icon: 'announcement',
        })),
      ];
      setResults(combined);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
