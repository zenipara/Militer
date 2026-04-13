import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { Role } from '../../types';

interface BottomTabItem {
  path: string;
  label: string;
  icon: string;
}

/** Mobile bottom tab: show max 5 primary nav items per role (spec §10.2) */
const BOTTOM_TABS: Record<Role, BottomTabItem[]> = {
  admin: [
    { path: '/admin/dashboard', label: 'Home', icon: '⊞' },
    { path: '/admin/users', label: 'Personel', icon: '👥' },
    { path: '/admin/logistics', label: 'Logistik', icon: '📦' },
    { path: '/admin/announcements', label: 'Pengumuman', icon: '📢' },
    { path: '/admin/settings', label: 'Setelan', icon: '⚙' },
  ],
  komandan: [
    { path: '/komandan/dashboard', label: 'Home', icon: '⊞' },
    { path: '/komandan/tasks', label: 'Tugas', icon: '✓' },
    { path: '/komandan/personnel', label: 'Personel', icon: '👥' },
    { path: '/komandan/attendance', label: 'Hadir', icon: '📅' },
    { path: '/komandan/reports', label: 'Laporan', icon: '📊' },
  ],
  prajurit: [
    { path: '/prajurit/dashboard', label: 'Home', icon: '⊞' },
    { path: '/prajurit/tasks', label: 'Tugas', icon: '✓' },
    { path: '/prajurit/attendance', label: 'Absensi', icon: '📅' },
    { path: '/prajurit/messages', label: 'Pesan', icon: '✉' },
    { path: '/prajurit/profile', label: 'Profil', icon: '👤' },
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

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-card border-t border-surface safe-area-inset-bottom"
      aria-label="Bottom navigation"
    >
      <div className="flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors
              ${isActive ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`
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
