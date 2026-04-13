import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { Role } from '../../types';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  admin: [
    { path: '/admin/dashboard', label: 'Control Center', icon: '⊞' },
    { path: '/admin/users', label: 'Personel', icon: '👥' },
    { path: '/admin/logistics', label: 'Logistik', icon: '📦' },
    { path: '/admin/documents', label: 'Dokumen', icon: '📄' },
    { path: '/admin/announcements', label: 'Pengumuman', icon: '📢' },
    { path: '/admin/schedule', label: 'Jadwal Shift', icon: '📅' },
    { path: '/admin/attendance', label: 'Rekap Absensi', icon: '✅' },
    { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
    { path: '/admin/settings', label: 'Pengaturan', icon: '⚙' },
  ],
  komandan: [
    { path: '/komandan/dashboard', label: 'Ops Center', icon: '⊞' },
    { path: '/komandan/tasks', label: 'Tugas', icon: '✓' },
    { path: '/komandan/personnel', label: 'Personel', icon: '👥' },
    { path: '/komandan/attendance', label: 'Kehadiran', icon: '📅' },
    { path: '/komandan/evaluation', label: 'Evaluasi', icon: '📝' },
    { path: '/komandan/reports', label: 'Laporan', icon: '📊' },
  ],
  prajurit: [
    { path: '/prajurit/dashboard', label: 'Dashboard', icon: '⊞' },
    { path: '/prajurit/tasks', label: 'Tugas Saya', icon: '✓' },
    { path: '/prajurit/attendance', label: 'Absensi', icon: '📅' },
    { path: '/prajurit/messages', label: 'Pesan', icon: '✉' },
    { path: '/prajurit/leave', label: 'Permohonan Izin', icon: '🏖' },
    { path: '/prajurit/profile', label: 'Profil', icon: '👤' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabelMap: Record<Role, string> = {
    admin: 'Administrator',
    komandan: 'Komandan',
    prajurit: 'Prajurit',
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-30 h-full w-60 bg-bg-card border-r border-surface
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-surface">
          <span className="text-2xl">🪖</span>
          <div>
            <div className="text-lg font-bold text-text-primary leading-tight">KARYO OS</div>
            <div className="text-xs text-text-muted">Command & Battalion</div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-surface">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface/50">
            <div className="h-10 w-10 rounded-full bg-primary/30 flex items-center justify-center text-primary font-bold">
              {user.nama.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-text-primary truncate">{user.nama}</div>
              <div className="text-xs text-text-muted">
                {user.pangkat ?? roleLabelMap[user.role]} — {user.satuan}
              </div>
            </div>
            <div className="h-2 w-2 rounded-full bg-success flex-shrink-0" title="Online" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface/60'
                }`
              }
              onClick={() => {
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-surface">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-accent-red hover:bg-accent-red/10 transition-colors"
          >
            <span className="text-base w-5 text-center">⏻</span>
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
