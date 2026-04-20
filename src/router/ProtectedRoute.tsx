import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useFeatureStore } from '../store/featureStore';
import { isPathEnabled } from '../lib/featureFlags';
import { getRoleDefaultPath, getRoleFallbackPaths } from '../lib/rolePermissions';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Role } from '../types';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

function getRoleFallbackPath(role: Role, flags: ReturnType<typeof useFeatureStore.getState>['flags']): string | null {
  const candidates = getRoleFallbackPaths(role);
  return candidates.find((path) => isPathEnabled(path, flags)) ?? null;
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const hasUser = useAuthStore((s) => Boolean(s.user));
  const userRole = useAuthStore((s) => s.user?.role ?? null);
  const { pathname } = useLocation();
  const { flags, isLoaded, loadFeatureFlags } = useFeatureStore();

  useEffect(() => {
    if (!hasUser) return;
    if (isLoaded) return;
    void loadFeatureFlags();
  }, [hasUser, isLoaded, loadFeatureFlags]);

  if (!isInitialized) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated || !userRole) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={getRoleDefaultPath(userRole) ?? '/login'} replace />;
  }

  if (!isLoaded) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isPathEnabled(pathname, flags)) {
    const fallbackPath = getRoleFallbackPath(userRole, flags);
    if (!fallbackPath || fallbackPath === pathname) {
      return (
        <Navigate
          to="/error"
          replace
          state={{
            code: '403',
            message: 'Modul untuk peran Anda sedang dinonaktifkan oleh admin.',
          }}
        />
      );
    }

    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
