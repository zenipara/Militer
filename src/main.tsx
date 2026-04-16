import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from './router';
import { useAuthStore } from './store/authStore';
import { usePlatformStore } from './store/platformStore';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import { measurePageLoad } from './lib/metrics';

// Mulai pengukuran load halaman sebelum render pertama
measurePageLoad();

export function App() {
  const { restoreSession, isLoading } = useAuthStore();
  const { loadPlatformBranding } = usePlatformStore();

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    void loadPlatformBranding();
  }, [loadPlatformBranding]);

  if (isLoading) return <LoadingSpinner fullScreen />;

  return <RouterProvider router={router} />;
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
