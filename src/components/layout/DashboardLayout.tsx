import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomTabBar from './BottomTabBar';
import Notification from '../common/Notification';
import { useNotifications } from '../../hooks/useNotifications';
import { useUIStore } from '../../store/uiStore';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  // Activate browser push notifications for all logged-in users
  useNotifications();
  const { displayDensity } = useUIStore();

  const mainPadding = displayDensity === 'compact'
    ? 'px-4 py-4 pb-28 sm:px-5 lg:px-6 lg:py-6 lg:pb-8'
    : 'px-5 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7 lg:pb-8';

  const shellWidth = displayDensity === 'compact' ? 'max-w-[1440px]' : 'max-w-[1360px]';

  return (
    <div className="desktop-shell flex h-screen overflow-hidden bg-military-dark" data-density={displayDensity}>
      <Sidebar />
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <Navbar title={title} />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-60"
          style={{
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent)',
          }}
        />
        {/* pb-28 on mobile to avoid content being hidden behind BottomTabBar + safe area */}
        <main className={`relative flex-1 overflow-y-auto scroll-y ${mainPadding}`}>
          <div className={`mx-auto w-full ${shellWidth} animate-fade-up`}>
            {children}
          </div>
        </main>
      </div>
      <BottomTabBar />
      <Notification />
    </div>
  );
}
