import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomTabBar from './BottomTabBar';
import Notification from '../common/Notification';
import { useNotifications } from '../../hooks/useNotifications';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  // Activate browser push notifications for all logged-in users
  useNotifications();

  return (
    <div className="flex h-screen bg-military-dark overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title={title} />
        {/* pb-20 on mobile to avoid content being hidden behind BottomTabBar */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomTabBar />
      <Notification />
    </div>
  );
}
