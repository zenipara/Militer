/**
 * Feature: Auth
 *
 * Barrel export untuk semua yang berkaitan dengan autentikasi:
 * store, hook, ProtectedRoute.
 *
 * Penggunaan:
 *   import { useAuthStore, ProtectedRoute } from '@/features/auth';
 */
export { useAuthStore } from '@/store/authStore';
export { useAuth } from '@/hooks/useAuth';
export { default as ProtectedRoute } from '@/router/ProtectedRoute';
