import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, CalendarDays, Megaphone,
  UserCheck, Users, Package, Settings, BarChart2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import type { Role } from '../../types';

interface BottomTabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
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
    { path: '/komandan/reports',    label: 'Laporan',   icon: <BarChart2 size={20} aria-hidden="true" /> },
  ],
  prajurit: [
    { path: '/prajurit/dashboard',  label: 'Beranda', icon: <LayoutDashboard size={20} aria-hidden="true" /> },
    { path: '/prajurit/tasks',      label: 'Tugas',   icon: <CheckSquare size={20} aria-hidden="true" /> },
    { path: '/prajurit/attendance', label: 'Absensi', icon: <CalendarDays size={20} aria-hidden="true" /> },
    { path: '/prajurit/messages',   label: 'Pesan',   icon: <Megaphone size={20} aria-hidden="true" /> },
    { path: '/prajurit/profile',    label: 'Profil',  icon: <UserCheck size={20} aria-hidden="true" /> },
  ],
  guard: [
    { path: '/guard/dashboard', label: 'Beranda', icon: <LayoutDashboard size={20} aria-hidden="true" /> },
    { path: '/guard/gate-scanner', label: 'Scan', icon: <CheckSquare size={20} aria-hidden="true" /> },
    { path: '/guard/gatepass', label: 'Gate Pass', icon: <Package size={20} aria-hidden="true" /> },
    { path: '/guard/attendance', label: 'Absensi', icon: <CalendarDays size={20} aria-hidden="true" /> },
    { path: '/guard/settings', label: 'Setelan', icon: <Settings size={20} aria-hidden="true" /> },
  ],
};

/**
 * Mobile-only bottom tab bar (visible only on < lg screens).
 * Provides quick navigation to up to 5 primary destinations per role.
 * Spec §10.2: "Mobile — Bottom Tab Bar navigation (4-5 item)"
 */
export default function BottomTabBar() {
  const { user } = useAuthStore();
  if (!user) return null;

  const tabs = BOTTOM_TABS[user.role];

  if (!tabs) return null;

  return (
    <nav
      className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-surface/80 bg-bg-card/90 backdrop-blur-xl lg:hidden"
      aria-label="Bottom navigation"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 py-1.5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs font-medium transition-colors
              ${isActive ? 'bg-primary/15 text-primary' : 'text-text-muted hover:bg-surface/60 hover:text-text-primary'}`
            }
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="text-[10px] leading-none">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
