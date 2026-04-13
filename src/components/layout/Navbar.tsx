import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import GlobalSearch from '../ui/GlobalSearch';

interface NavbarProps {
  title: string;
}

export default function Navbar({ title }: NavbarProps) {
  const { user } = useAuthStore();
  const { toggleSidebar, toggleDarkMode, isDarkMode } = useUIStore();

  return (
    <header className="sticky top-0 z-10 h-14 bg-bg-card/80 backdrop-blur-md border-b border-surface flex items-center px-4 gap-4" data-print-hide>
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 className="flex-1 text-base font-semibold text-text-primary">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Global search */}
        <GlobalSearch />

        {/* NRP display */}
        <span className="hidden sm:block font-mono text-xs text-text-muted bg-surface px-2 py-1 rounded">
          {user?.nrp}
        </span>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          aria-label={isDarkMode ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
          title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
        >
          {isDarkMode ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.7.7M5.63 18.37l-.7.7m0-12.74.7.7M18.37 18.37l.7.7M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Online indicator */}
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="hidden sm:block text-xs text-text-muted">Online</span>
        </div>
      </div>
    </header>
  );
}
