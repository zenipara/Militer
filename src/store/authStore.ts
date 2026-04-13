import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Role, KaryoSession } from '../types';

const SESSION_KEY = 'karyo_session';
const SESSION_DURATION_HOURS = 8;

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (nrp: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateOnlineStatus: (status: boolean) => Promise<void>;
  clearError: () => void;
}

const saveSession = (userId: string, role: Role): void => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);
  const session: KaryoSession = {
    user_id: userId,
    role,
    expires_at: expiresAt.toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const loadSession = (): KaryoSession | null => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as KaryoSession;
    if (new Date(session.expires_at) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (nrp: string, pin: string) => {
    set({ isLoading: true, error: null });
    try {
      // Call Supabase RPC to verify PIN
      const { data, error } = await supabase.rpc('verify_user_pin', {
        p_nrp: nrp,
        p_pin: pin,
      });

      if (error) throw new Error('Terjadi kesalahan sistem. Coba lagi.');
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error('NRP atau PIN salah, atau akun tidak aktif.');
      }

      const result = Array.isArray(data) ? data[0] : data;
      const userId: string = result.user_id as string;

      // Fetch full user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error('Gagal memuat data pengguna.');
      }

      const user = userData as User;

      // Update last_login and is_online
      await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          is_online: true,
          login_attempts: 0,
          locked_until: null,
        })
        .eq('id', userId);

      // Log the login action
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'LOGIN',
        resource: 'auth',
        detail: { nrp, role: user.role },
      });

      saveSession(userId, user.role);
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal.';

      // Handle failed login attempts
      if (message.includes('NRP atau PIN salah')) {
        await supabase.rpc('increment_login_attempts', { p_nrp: nrp });
      }

      set({ isLoading: false, error: message, isAuthenticated: false, user: null });
      throw err;
    }
  },

  logout: async () => {
    const { user } = get();
    if (user) {
      await supabase
        .from('users')
        .update({ is_online: false })
        .eq('id', user.id);

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'LOGOUT',
        resource: 'auth',
      });
    }
    clearSession();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    const session = loadSession();
    if (!session) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user_id)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        clearSession();
        set({ isLoading: false });
        return;
      }

      const user = userData as User;
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearSession();
      set({ isLoading: false });
    }
  },

  updateOnlineStatus: async (status: boolean) => {
    const { user } = get();
    if (!user) return;
    await supabase.from('users').update({ is_online: status }).eq('id', user.id);
    set({ user: { ...user, is_online: status } });
  },
}));
