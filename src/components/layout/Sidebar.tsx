import { NavLink, useNavigate } from 'react-router-dom';
import { ICONS, IconType } from '../../icons';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { usePlatformStore } from '../../store/platformStore';
import { useFeatureStore } from '../../store/featureStore';
import { isPathEnabled } from '../../lib/featureFlags';
import type { Role } from '../../types';
import { useRef } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: keyof typeof ICONS;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  admin: [
    { path: '/admin/dashboard',     label: 'Pusat Kendali',  icon: 'LayoutDashboard' },
    { path: '/admin/users',         label: 'Personel',       icon: 'Users' },
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
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { settings } = usePlatformStore();
  const { flags } = useFeatureStore();
  const navigate = useNavigate();

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

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role].filter((item) => isPathEnabled(item.path, flags));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabelMap: Record<Role, string> = {
    admin: 'Administrator',
    komandan: 'Komandan',
    prajurit: 'Prajurit',
    guard: 'Guard',
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
          app-panel fixed left-0 top-0 z-30 h-full w-[248px] border-r border-surface/60
          flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Logo */}
        <div className="border-b border-surface/60 px-5 py-4">
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
            <div className="h-2 w-2 rounded-full bg-success flex-shrink-0 ring-2 ring-success/20" title="Online" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {navItems.map((item) => {
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
