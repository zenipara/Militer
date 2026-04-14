import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, KaryoSession } from '../types';

const SESSION_KEY = 'karyo_session';
const CRYPTO_KEY_SESSION = 'karyo_session_key';
const SESSION_DURATION_HOURS = 8;

// Explicit user columns — excludes server-only columns such as pin_hash
const USER_COLUMNS =
  'id, nrp, nama, role, pangkat, jabatan, satuan, foto_url, is_active, is_online, login_attempts, locked_until, last_login, created_at, updated_at';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (nrp: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateOnlineStatus: (status: boolean) => Promise<void>;
  clearError: () => void;
}

// ── Crypto helpers ───────────────────────────────────────────────

const encodeBase64 = (data: Uint8Array | ArrayBuffer): string => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  // Use Array.from to avoid spread-operator stack overflow on large buffers
  return btoa(String.fromCharCode(...Array.from(bytes)));
};

const decodeBase64 = (str: string): Uint8Array =>
  Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

const generateAndStoreKey = async (): Promise<CryptoKey> => {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const raw = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(CRYPTO_KEY_SESSION, encodeBase64(new Uint8Array(raw)));
  return key;
};

const loadStoredKey = async (): Promise<CryptoKey | null> => {
  const stored = sessionStorage.getItem(CRYPTO_KEY_SESSION);
  if (!stored) return null;
  try {
    const raw = decodeBase64(stored);
    return await crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  } catch {
    return null;
  }
};

const makeSessionExpiry = (): string => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);
  return expiresAt.toISOString();
};


// The encryption key lives in sessionStorage (tab-scoped, cleared on tab
// close) while the ciphertext lives in localStorage.  An XSS script that
// can only exfiltrate localStorage cannot decrypt the session without also
// obtaining the sessionStorage key from the same tab.

export const saveSession = async (session: KaryoSession): Promise<void> => {
  const key = await generateAndStoreKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(session));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ iv: encodeBase64(iv), data: encodeBase64(new Uint8Array(ciphertext)) }),
  );
};

export const loadSession = async (): Promise<KaryoSession | null> => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  const key = await loadStoredKey();
  if (!key) {
    // Key missing (new tab or cleared storage) — treat session as gone
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  try {
    const { iv: ivStr, data: dataStr } = JSON.parse(raw) as { iv: string; data: string };
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decodeBase64(ivStr) },
      key,
      decodeBase64(dataStr),
    );
    const session = JSON.parse(new TextDecoder().decode(decrypted)) as KaryoSession;
    if (new Date(session.expires_at) < new Date()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
};

const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(CRYPTO_KEY_SESSION);
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
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

      if (error) {
        // Log error detail to console for debugging
        // @ts-ignore
        if (typeof window !== 'undefined') console.error('Supabase verify_user_pin error:', error);
        throw new Error('Terjadi kesalahan sistem. Coba lagi.');
      }
      if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error('NRP atau PIN salah, atau akun tidak aktif.');
      }

      const result = Array.isArray(data) ? data[0] : data;
      const userId: string = result.user_id as string;

      // Fetch full user data (exclude server-only columns such as pin_hash)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(USER_COLUMNS)
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        // Log error detail to console for debugging
        // @ts-ignore
        if (typeof window !== 'undefined') console.error('Supabase users fetch error:', userError);
        throw new Error('Gagal memuat data pengguna.');
      }

      const user = userData as User;

      // Bind user identity to DB session so RLS policies can read it
      await supabase.rpc('set_session_context', {
        p_user_id: userId,
        p_role: user.role,
      });

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

      await saveSession({ user_id: userId, role: user.role, expires_at: makeSessionExpiry() });
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal.';

      // Handle failed login attempts
      if (message.includes('NRP atau PIN salah')) {
        await supabase.rpc('increment_login_attempts', { p_nrp: nrp });
      }

      // Log error detail to console for debugging
      // @ts-ignore
      if (typeof window !== 'undefined') console.error('Login error:', err);

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
    const session = await loadSession();
    if (!session) {
      set({ isLoading: false, isInitialized: true });
      return;
    }
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select(USER_COLUMNS)
        .eq('id', session.user_id)
        .eq('is_active', true)
        .single();

      if (error || !userData) {
        clearSession();
        set({ isLoading: false, isInitialized: true });
        return;
      }

      const user = userData as User;

      // Re-bind user identity to the new DB session for RLS policies
      await supabase.rpc('set_session_context', {
        p_user_id: session.user_id,
        p_role: user.role,
      });

      set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
    } catch {
      clearSession();
      set({ isLoading: false, isInitialized: true });
    }
  },

  updateOnlineStatus: async (status: boolean) => {
    const { user } = get();
    if (!user) return;
    await supabase.from('users').update({ is_online: status }).eq('id', user.id);
    set({ user: { ...user, is_online: status } });
  },
}));
