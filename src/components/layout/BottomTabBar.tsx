import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, CalendarDays, Megaphone,
  UserCheck, Users, Package, Settings, ScanLine,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useFeatureStore } from '../../store/featureStore';
import { useMessages } from '../../hooks/useMessages';
import { isPathEnabled } from '../../lib/featureFlags';
import type { Role } from '../../types';

interface BottomTabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  hasMessageBadge?: boolean;
}

/** Mobile bottom tab: show max 5 primary nav items per role (spec §10.2) */
const BOTTOM_TABS: Record<Role, BottomTabItem[]> = {
  admin: [
    { path: '/admin/dashboard',     label: 'Beranda',    icon: <LayoutDashboard size={20} aria-hidden="true" /> },
    { path: '/admin/users',         label: 'Personel',   icon: <Users size={20} aria-hidden="true" /> },
    { path: '/admin/logistics',     label: 'Logistik',   icon: <Package size={20} aria-hidden="true" /> },
    { path: '/admin/announcements', label: 'Pengumuman', icon: <Megaphone size={20} aria-hidden="true" /> },
    { path: '/admin/settings',      label: 'Setelan',    icon: <Settings size={20} aria-hidden="true" /> },
  ],
  komandan: [
    { path: '/komandan/dashboard',  label: 'Beranda',   icon: <LayoutDashboard size={20} aria-hidden="true" /> },
    { path: '/komandan/tasks',      label: 'Tugas',     icon: <CheckSquare size={20} aria-hidden="true" /> },
    { path: '/komandan/personnel',  label: 'Personel',  icon: <Users size={20} aria-hidden="true" /> },
    { path: '/komandan/attendance', label: 'Hadir',     icon: <CalendarDays size={20} aria-hidden="true" /> },
    { path: '/komandan/messages',   label: 'Pesan',     icon: <Megaphone size={20} aria-hidden="true" />, hasMessageBadge: true },
  ],
  prajurit: [
    { path: '/prajurit/dashboard',  label: 'Beranda',   icon: <LayoutDashboard size={20} aria-hidden="true" /> },
    { path: '/prajurit/gatepass',   label: 'Gate Pass', icon: <CheckSquare size={20} aria-hidden="true" /> },
    { path: '/prajurit/scan-pos',   label: 'Scan Pos',  icon: <ScanLine size={20} aria-hidden="true" /> },
    { path: '/prajurit/attendance', label: 'Absensi',   icon: <CalendarDays size={20} aria-hidden="true" /> },
    { path: '/prajurit/profile',    label: 'Profil',    icon: <UserCheck size={20} aria-hidden="true" /> },
  ],
  // Guard hanya memiliki satu rute aktif: /guard/gatepass-scan
  guard: [
    { path: '/guard/gatepass-scan', label: 'Scan', icon: <CheckSquare size={20} aria-hidden="true" /> },
  ],
};

/**
 * Mobile-only bottom tab bar (visible only on < lg screens).
 * Provides quick navigation to up to 5 primary destinations per role.
 * Spec §10.2: "Mobile — Bottom Tab Bar navigation (4-5 item)"
 */
export default function BottomTabBar() {
  const { user } = useAuthStore();
  const { flags } = useFeatureStore();
  const { unreadCount } = useMessages();

  if (!user) return null;

  const tabs = BOTTOM_TABS[user.role].filter((tab) => isPathEnabled(tab.path, flags));

  if (!tabs || tabs.length === 0) return null;

  const gridColsClass: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  };
  const colsClass = gridColsClass[Math.min(tabs.length, 5)] ?? 'grid-cols-5';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface/80 bg-bg-card/92 backdrop-blur-xl lg:hidden"
      aria-label="Bottom navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className={`mx-auto grid max-w-xl ${colsClass} gap-0 px-1 pt-1 pb-1.5`}>
        {tabs.map((tab) => {
          const showBadge = tab.hasMessageBadge && unreadCount > 0;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-0.5 rounded-xl min-h-[52px] py-1 px-1 text-xs font-medium transition-colors
                ${isActive ? 'bg-primary/12 text-primary' : 'text-text-muted hover:bg-surface/60 hover:text-text-primary'}`
              }
              aria-label={showBadge ? `${tab.label} — ${unreadCount} belum dibaca` : tab.label}
            >
              <span className="relative text-[22px] leading-none">
                {tab.icon}
                {showBadge && (
                  <span
                    className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent-red px-0.5 text-[9px] font-bold text-white leading-none"
                    aria-hidden="true"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-none mt-0.5">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
