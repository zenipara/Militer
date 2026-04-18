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
          className="fixed inset-0 z-20 bg-slate-950/25 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          app-panel fixed left-0 top-0 z-30 h-full w-[240px] border-r border-surface/80
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Logo */}
        <div className="border-b border-surface/80 px-5 py-5">
          <div className="flex items-center gap-3">
            {settings.platformLogoUrl ? (
              <img
                src={settings.platformLogoUrl}
                alt={settings.platformName}
                className="h-10 w-10 rounded-2xl border border-primary/20 bg-primary/10 object-cover"
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-lg text-primary">◈</span>
            )}
            <div>
              <div className="text-base font-extrabold tracking-tight text-text-primary leading-tight">{settings.platformName}</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-muted">{settings.platformTagline}</div>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="border-b border-surface/80 px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-surface/70 bg-slate-50/70 p-3 dark:bg-surface/35">
            {user.foto_url ? (
              <img
                src={user.foto_url}
                alt={user.nama}
                className="h-10 w-10 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 font-bold text-primary flex-shrink-0">
                {user.nama.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-text-primary">{user.nama}</div>
              <div className="truncate text-xs text-text-muted">
                {user.pangkat ?? roleLabelMap[user.role]} — {user.satuan}
              </div>
            </div>
            <div className="h-2 w-2 rounded-full bg-success flex-shrink-0" title="Online" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon] as IconType;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'text-text-muted hover:bg-slate-100 hover:text-text-primary dark:hover:bg-surface/60'
                  }`
                }
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-black/[0.04] text-center dark:bg-white/[0.06]">
                  {Icon ? <Icon className="w-5 h-5" aria-hidden="true" /> : null}
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-surface/80 px-3 py-4">
          <button
            onClick={handleLogout}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red/10"
          >
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-accent-red/10 text-center text-sm">
              {ICONS.LogOut ? <ICONS.LogOut className="w-4 h-4" aria-hidden="true" /> : null}
            </span>
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
