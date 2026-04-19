import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ICONS } from '../../icons';
import { useAuthStore } from '../../store/authStore';
import { useFeatureStore } from '../../store/featureStore';
import { useUIStore } from '../../store/uiStore';
import { useMessages } from '../../hooks/useMessages';
import { isPathEnabled } from '../../lib/featureFlags';
import GlobalSearch from '../ui/GlobalSearch';
import type { Role } from '../../types';

interface NavbarProps {
  title: string;
}

const PROFILE_PATH: Record<Role, string> = {
  prajurit: '/prajurit/profile',
  komandan: '/komandan/personnel',
  admin: '/admin/users',
  guard: '/guard/gatepass-scan',
};

/** Rute inbox pesan per role. Guard tidak memiliki halaman pesan. */
const MESSAGES_PATH: Partial<Record<Role, string>> = {
  prajurit: '/prajurit/messages',
  komandan: '/komandan/messages',
};

export default function Navbar({ title }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const { flags } = useFeatureStore();
  const { toggleSidebar, toggleDarkMode, isDarkMode } = useUIStore();
  const { unreadCount } = useMessages();
  const navigate = useNavigate();
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAvatarDropdownOpen(false);
      }
    };
    if (isAvatarDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAvatarDropdownOpen]);

  const handleAvatarKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsAvatarDropdownOpen(false);
  };

  const handleLogout = async () => {
    setIsAvatarDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const roleLabelMap: Record<Role, string> = {
    admin: 'Administrator',
    komandan: 'Komandan',
    prajurit: 'Prajurit',
    guard: 'Guard',
  };

  const messagePath = user?.role ? MESSAGES_PATH[user.role] : undefined;
  const canOpenMessages = Boolean(messagePath && isPathEnabled(messagePath, flags));

  return (
    <header className="sticky top-0 z-20 border-b border-surface/60 bg-bg-card/90 px-4 backdrop-blur-2xl sm:px-5 lg:px-8" data-print-hide>
      <div className="flex h-16 items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden flex h-11 w-11 items-center justify-center rounded-xl text-text-muted transition-all duration-200 hover:bg-slate-100 hover:text-text-primary active:scale-[0.93] dark:hover:bg-surface/60"
          aria-label="Toggle sidebar"
        >
          {ICONS.Menu ? (
            <ICONS.Menu className="h-5 w-5" aria-hidden="true" />
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold text-text-primary sm:text-base">{title}</h1>
          <p className="hidden text-[11px] text-text-muted sm:block">Workspace operasional terintegrasi</p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Global search */}
          <GlobalSearch />

          {/* NRP display */}
          <span className="hidden rounded-lg border border-surface/80 bg-slate-50/80 px-2.5 py-1 text-[11px] text-text-muted sm:block dark:bg-surface/35 font-mono">
            {user?.nrp}
          </span>

          {/* Bell — shows unread message count badge */}
          {canOpenMessages && (
            <div className="relative">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface/70 bg-slate-50/80 text-text-muted transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.93] dark:bg-surface/35"
                aria-label={`Pesan${unreadCount > 0 ? ` — ${unreadCount} belum dibaca` : ''}`}
                title="Pesan & Notifikasi"
                onClick={() => {
                  if (messagePath) navigate(messagePath);
                }}
              >
                {ICONS.Bell ? <ICONS.Bell className="h-4 w-4" aria-hidden="true" /> : null}
              </button>
              {unreadCount > 0 && (
                <span
                  className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent-red px-0.5 text-[10px] font-bold text-white animate-scale-in"
                  aria-hidden="true"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl border border-surface/70 bg-slate-50/80 text-text-muted transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.93] dark:bg-surface/35"
            aria-label={isDarkMode ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
          >
            {isDarkMode ? (
              ICONS.Sun ? <ICONS.Sun className="h-4 w-4" aria-hidden="true" /> : <span aria-hidden="true">🌞</span>
            ) : (
              ICONS.Moon ? <ICONS.Moon className="h-4 w-4" aria-hidden="true" /> : <span aria-hidden="true">🌙</span>
            )}
          </button>

          {/* Avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
              onKeyDown={handleAvatarKeyDown}
              className="flex h-10 items-center gap-2 rounded-xl border border-surface/70 bg-slate-50/80 px-2 py-1 text-left transition-all duration-200 hover:bg-slate-100 hover:border-primary/30 active:scale-[0.97] focus:border-primary focus:bg-blue-50/80 dark:bg-surface/35 dark:hover:bg-surface/60 dark:focus:bg-primary/10"
              aria-label="Profil pengguna"
              aria-expanded={isAvatarDropdownOpen}
              aria-haspopup="menu"
            >
              {user?.foto_url ? (
                <img
                  src={user.foto_url}
                  alt={user.nama}
                  className="h-7 w-7 rounded-lg object-cover ring-1 ring-primary/20"
                />
              ) : (
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-blue-600/20 text-xs font-semibold text-primary" aria-hidden="true">
                  {user?.nama?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block">
                <p className="max-w-[120px] truncate text-xs font-medium text-text-primary">{user?.nama}</p>
                <p className="text-[10px] text-text-muted">{roleLabelMap[user?.role ?? 'prajurit']}</p>
              </div>
            </button>

            {/* Dropdown menu */}
            <div
              className={`absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-2xl border border-surface/70 bg-bg-card p-2 shadow-xl shadow-slate-900/10 transition-all duration-200 ${
                isAvatarDropdownOpen
                  ? 'pointer-events-auto translate-y-0 opacity-100 animate-scale-in'
                  : 'pointer-events-none -translate-y-2 opacity-0'
              }`}
              role="menu"
            >
              {/* User info header */}
              <div className="mb-1 border-b border-surface/60 px-2 pb-2.5 pt-1">
                <p className="text-xs font-semibold text-text-primary truncate">{user?.nama}</p>
                <p className="text-[10px] text-text-muted font-mono">{user?.nrp}</p>
              </div>

              {/* Profil link — only for roles that have a profile page */}
              {user?.role === 'prajurit' && (
                <Link
                  to={PROFILE_PATH[user.role]}
                  role="menuitem"
                  onClick={() => setIsAvatarDropdownOpen(false)}
                  className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-2 py-2.5 text-sm text-text-primary transition-all duration-150 hover:bg-slate-100/80 dark:hover:bg-surface/50"
                >
                  {ICONS.User ? <ICONS.User className="w-4 h-4 text-text-muted" aria-hidden="true" /> : null}
                  Profil Saya
                </Link>
              )}

              {/* Pengaturan link — admin only */}
              {user?.role === 'admin' && (
                <Link
                  to="/admin/settings"
                  role="menuitem"
                  onClick={() => setIsAvatarDropdownOpen(false)}
                  className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-2 py-2.5 text-sm text-text-primary transition-all duration-150 hover:bg-slate-100/80 dark:hover:bg-surface/50"
                >
                  {ICONS.Settings ? <ICONS.Settings className="w-4 h-4 text-text-muted" aria-hidden="true" /> : null}
                  Pengaturan
                </Link>
              )}

              <div className="my-1 border-t border-surface/60" />

              {/* Keluar */}
              <button
                role="menuitem"
                onClick={handleLogout}
                className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-sm text-accent-red transition-all duration-150 hover:bg-accent-red/8"
              >
                {ICONS.LogOut ? <ICONS.LogOut className="w-4 h-4" aria-hidden="true" /> : null}
                Keluar
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
