/**
 * useAuth — Convenience hook untuk mengakses state autentikasi dan
 * aksi login/logout dari komponen manapun.
 *
 * Penggunaan:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 */
export { useAuthStore as useAuth } from '../store/authStore';
