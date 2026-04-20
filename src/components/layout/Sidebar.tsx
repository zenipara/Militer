import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ICONS, IconType } from '../../icons';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { usePlatformStore } from '../../store/platformStore';
import { useFeatureStore } from '../../store/featureStore';
import { isPathEnabled } from '../../lib/featureFlags';
import type { Role } from '../../types';

interface NavItem {
  path: string;
  label: string;
  icon: keyof typeof ICONS;
}

type NavSection = 'Utama' | 'Operasional' | 'Administrasi' | 'Komunikasi' | 'Pribadi' | 'Sistem';
const SECTION_ORDER: NavSection[] = ['Utama', 'Operasional', 'Administrasi', 'Komunikasi', 'Pribadi', 'Sistem'];

const resolveNavSection = (item: NavItem): NavSection => {
  const { path } = item;
  if (path.includes('/dashboard')) return 'Utama';
  if (path.includes('/messages') || path.includes('/announcements')) return 'Komunikasi';
  if (path.includes('/profile') || path.includes('/leave')) return 'Pribadi';
  if (path.includes('/settings')) return 'Sistem';
  if (path.includes('/audit') || path.includes('/users') || path.includes('/satuan') || path.includes('/documents')) return 'Administrasi';
  return 'Operasional';
};

const NAV_ITEMS: Record<Role, NavItem[]> = {
  admin: [
    { path: '/admin/dashboard',     label: 'Pusat Kendali',  icon: 'LayoutDashboard' },
    { path: '/admin/satuan',        label: 'Satuan',         icon: 'Building2' },
    { path: '/admin/users',         label: 'Personel',       icon: 'Users' },
    { path: '/admin/analytics',     label: 'Analitik',       icon: 'TrendingUp' },
    { path: '/admin/logistics',     label: 'Logistik',       icon: 'Package' },
    { path: '/admin/documents',     label: 'Dokumen',        icon: 'FileText' },
    { path: '/admin/announcements', label: 'Pengumuman',     icon: 'Megaphone' },
    { path: '/admin/schedule',      label: 'Jadwal Shift',   icon: 'CalendarDays' },
    { path: '/admin/attendance',    label: 'Rekap Absensi',  icon: 'ClipboardCheck' },
    { path: '/admin/gatepass-monitor', label: 'Gate Pass',   icon: 'ClipboardCheck' },
    { path: '/admin/pos-jaga',          label: 'Pos Jaga',    icon: 'MapPin' },
    { path: '/admin/audit',             label: 'Audit Log',   icon: 'ScrollText' },
    { path: '/admin/settings',      label: 'Pengaturan',     icon: 'Settings' },
  ],
  komandan: [
    { path: '/komandan/dashboard',          label: 'Pusat Operasi',       icon: 'LayoutDashboard' },
    { path: '/komandan/tasks',              label: 'Tugas',                icon: 'CheckSquare' },
    { path: '/komandan/personnel',          label: 'Personel',             icon: 'Users' },
    { path: '/komandan/attendance',         label: 'Kehadiran',            icon: 'CalendarDays' },
    { path: '/komandan/gatepass-approval',  label: 'Approval Gate Pass',   icon: 'ClipboardCheck' },
    { path: '/komandan/gatepass-monitor',   label: 'Monitoring Gate Pass', icon: 'BarChart2' },
    { path: '/komandan/evaluation',         label: 'Evaluasi',             icon: 'NotebookPen' },
    { path: '/komandan/reports',            label: 'Laporan',              icon: 'BarChart2' },
    { path: '/komandan/logistics-request',  label: 'Permintaan Logistik',  icon: 'ClipboardList' },
    { path: '/komandan/messages',           label: 'Pesan',                icon: 'Megaphone' },
  ],
  prajurit: [
    { path: '/prajurit/dashboard',   label: 'Beranda',           icon: 'LayoutDashboard' },
    { path: '/prajurit/gatepass',    label: 'Gate Pass',         icon: 'ClipboardCheck' },
    { path: '/prajurit/scan-pos',    label: 'Scan Pos Jaga',     icon: 'ScanLine' },
    { path: '/prajurit/tasks',       label: 'Tugas Saya',        icon: 'CheckSquare' },
    { path: '/prajurit/attendance',  label: 'Absensi',           icon: 'CalendarDays' },
    { path: '/prajurit/messages',    label: 'Pesan',             icon: 'Megaphone' },
    { path: '/prajurit/leave',       label: 'Permohonan Izin',   icon: 'UserCheck' },
    { path: '/prajurit/profile',     label: 'Profil',            icon: 'Users' },
  ],
  guard: [
    { path: '/guard/gatepass-scan', label: 'Scan Gate Pass', icon: 'ClipboardCheck' },
  ],
  staf: [
    { path: '/staf/dashboard',      label: 'Pusat Staf',     icon: 'LayoutDashboard' },
    { path: '/admin/users',         label: 'Personel',        icon: 'Users' },
    { path: '/admin/attendance',    label: 'Rekap Absensi',   icon: 'ClipboardCheck' },
    { path: '/admin/schedule',      label: 'Jadwal Shift',    icon: 'CalendarDays' },
    { path: '/admin/logistics',     label: 'Logistik',        icon: 'Package' },
    { path: '/komandan/tasks',      label: 'Tugas',           icon: 'CheckSquare' },
    { path: '/admin/pos-jaga',      label: 'Pos Jaga',        icon: 'MapPin' },
    { path: '/staf/messages',       label: 'Pesan',           icon: 'Megaphone' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { settings } = usePlatformStore();
  const { flags } = useFeatureStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Swipe-to-close: track touch start X position
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    // Swipe left ≥ 60px → close sidebar
    if (dx < -60) setSidebarOpen(false);
    touchStartX.current = null;
  };

  useEffect(() => {
    if (!sidebarOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const navItems = useMemo(() => {
    if (!user) return [] as NavItem[];
    return NAV_ITEMS[user.role].filter((item) => isPathEnabled(item.path, flags));
  }, [user, flags]);

  const filteredNavItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return navItems;
    return navItems.filter((item) =>
      `${item.label} ${item.path}`.toLowerCase().includes(normalizedQuery),
    );
  }, [navItems, query]);

  const groupedNavItems = useMemo(() => {
    const grouped = new Map<NavSection, NavItem[]>();
    filteredNavItems.forEach((item) => {
      const section = resolveNavSection(item);
      grouped.set(section, [...(grouped.get(section) ?? []), item]);
    });
    return SECTION_ORDER
      .map((section) => [section, grouped.get(section) ?? []] as const)
      .filter(([, items]) => items.length > 0);
  }, [filteredNavItems]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabelMap: Record<Role, string> = {
    admin: 'Super Admin',
    komandan: 'Komandan',
    prajurit: 'Prajurit',
    guard: 'Petugas Jaga / Provost',
    staf: 'Staf Operasional',
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-950/30 backdrop-blur-[3px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          app-panel fixed left-0 top-0 z-30 h-full w-[min(86vw,280px)] border-r border-surface/60 sm:w-[260px]
          flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Logo */}
        <div className="border-b border-surface/60 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {settings.platformLogoUrl ? (
                <img
                  src={settings.platformLogoUrl}
                  alt={settings.platformName}
                  className="h-10 w-10 rounded-2xl border border-primary/20 bg-primary/10 object-cover shadow-sm"
                />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-lg text-white shadow-md shadow-primary/30">◈</span>
              )}
              <div>
                <div className="text-sm font-extrabold tracking-tight text-text-primary leading-tight">{settings.platformName}</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-muted">{settings.platformTagline}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-xl text-text-muted transition-colors hover:bg-slate-100 dark:hover:bg-surface/50 lg:hidden"
              aria-label="Tutup navigasi"
            >
              {ICONS.X ? <ICONS.X className="h-5 w-5" aria-hidden="true" /> : '✕'}
            </button>
          </div>
        </div>

        <div className="border-b border-surface/60 px-4 py-3">
          <label htmlFor="sidebar-nav-search" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            Cari menu
          </label>
          <input
            id="sidebar-nav-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="form-control h-10 min-h-[40px] bg-slate-50/85 text-sm dark:bg-surface/35"
            placeholder="Contoh: personel, gate pass..."
            autoComplete="off"
          />
        </div>

        {/* User info */}
        <div className="border-b border-surface/60 px-4 py-3">
          <div className="flex items-center gap-3 rounded-xl border border-surface/50 bg-slate-50/80 p-2.5 dark:bg-surface/30">
            {user.foto_url ? (
              <img
                src={user.foto_url}
                alt={user.nama}
                className="h-9 w-9 rounded-xl object-cover flex-shrink-0 ring-2 ring-primary/20"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-blue-600/20 font-bold text-primary flex-shrink-0 text-sm">
                {user.nama.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-text-primary">{user.nama}</div>
              <div className="truncate text-[10px] text-text-muted">
                {user.pangkat ?? roleLabelMap[user.role]} — {user.satuan}
              </div>
            </div>
            <div className="h-2 w-2 status-dot status-dot--online status-dot--pulse flex-shrink-0" title="Online" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {groupedNavItems.map(([section, items]) => (
            <div key={section} className="space-y-1">
              <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
                {section}
              </p>
              {items.map((item) => {
                const Icon = ICONS[item.icon] as IconType;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `group relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/25'
                          : 'text-text-muted hover:bg-slate-100/80 hover:text-text-primary dark:hover:bg-surface/50'
                      }`
                    }
                    onClick={() => {
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-black/[0.06] text-center transition-colors duration-200 dark:bg-white/[0.08]">
                      {Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : null}
                    </span>
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
          {filteredNavItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-surface/80 px-3 py-4 text-center text-xs text-text-muted">
              Menu tidak ditemukan, ubah kata kunci pencarian.
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="border-t border-surface/60 px-3 py-3 space-y-1">
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-accent-red transition-all duration-200 hover:bg-accent-red/8 active:scale-[0.97]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-accent-red/10 text-center text-sm">
              {ICONS.LogOut ? <ICONS.LogOut className="w-4 h-4" aria-hidden="true" /> : null}
            </span>
            Keluar
          </button>
          <p className="px-3 text-[10px] text-text-muted/50 select-none">
            v{import.meta.env.VITE_APP_VERSION ?? '1.2.1'}
          </p>
        </div>
      </aside>
    </>
  );
}
