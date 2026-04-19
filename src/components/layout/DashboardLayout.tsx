import { useEffect, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomTabBar from './BottomTabBar';
import Notification from '../common/Notification';
import { ToastContainer } from '../common/Toast';
import { useNotifications } from '../../hooks/useNotifications';
import { useUIStore } from '../../store/uiStore';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  // Activate browser push notifications for all logged-in users
  useNotifications();
  const { displayDensity, setSidebarOpen } = useUIStore();

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    if (mediaQuery.matches) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  const mainPadding = displayDensity === 'compact'
    ? 'px-4 py-3 pb-28 sm:px-5 sm:py-4 lg:px-6 lg:py-6 lg:pb-8'
    : 'px-5 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7 lg:pb-8';

  const shellWidth = displayDensity === 'compact' ? 'max-w-[1440px]' : 'max-w-[1360px]';

  return (
    <div className="desktop-shell flex h-screen overflow-hidden bg-military-dark" data-density={displayDensity}>
      <Sidebar />
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <Navbar title={title} />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(to right, color-mix(in srgb, var(--color-primary) 40%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-primary) 40%, transparent) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-75"
          style={{
            background: 'radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 55%), linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)',
          }}
        />
        {/* pb-28 on mobile to avoid content being hidden behind BottomTabBar + safe area */}
        <main className={`relative flex-1 overflow-y-auto scroll-y ${mainPadding}`}>
          <div className={`mx-auto w-full ${shellWidth} animate-fade-up transition-all duration-300`}>
            {children}
          </div>
        </main>
      </div>
      <BottomTabBar />
      <Notification />
      <ToastContainer />
    </div>
  );
}
