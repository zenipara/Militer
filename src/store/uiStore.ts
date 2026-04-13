import { create } from 'zustand';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

const NOTIFICATION_DURATION_MS = 4000;
const DARK_MODE_KEY = 'karyo_dark_mode';

interface Notification {
  message: string;
  type: NotificationType;
}

interface UIStore {
  isDarkMode: boolean;
  sidebarOpen: boolean;
  notification: Notification | null;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  showNotification: (message: string, type: NotificationType) => void;
  clearNotification: () => void;
}

// Load persisted preference (default: dark)
const loadDarkMode = (): boolean => {
  try {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored === null) return true; // default dark
    return stored === 'true';
  } catch {
    return true;
  }
};

const applyTheme = (isDark: boolean) => {
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
};

export const useUIStore = create<UIStore>((set) => ({
  isDarkMode: loadDarkMode(),
  sidebarOpen: true,
  notification: null,

  toggleDarkMode: () =>
    set((state) => {
      const next = !state.isDarkMode;
      try {
        localStorage.setItem(DARK_MODE_KEY, String(next));
      } catch { /* ignore */ }
      applyTheme(next);
      return { isDarkMode: next };
    }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  showNotification: (message: string, type: NotificationType) => {
    set({ notification: { message, type } });
    setTimeout(() => set({ notification: null }), NOTIFICATION_DURATION_MS);
  },

  clearNotification: () => set({ notification: null }),
}));

// Apply theme on module load (before first render)
applyTheme(loadDarkMode());
