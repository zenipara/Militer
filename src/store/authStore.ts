import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { clearSessionContext, writeSessionContext } from '../lib/sessionContext';
import type { User, KaryoSession } from '../types';

const SESSION_KEY = 'karyo_session';
const CRYPTO_KEY_SESSION = 'karyo_session_key';
const SESSION_DURATION_HOURS = 8;
const AUTH_SYNC_CHANNEL = 'karyo_auth_sync';

type AuthSyncMessage =
  | { type: 'LOGIN'; session: KaryoSession }
  | { type: 'LOGOUT' };

const authBroadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(AUTH_SYNC_CHANNEL)
    : null;
let authSyncListenersBound = false;

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
  writeSessionContext(session);
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
    writeSessionContext(session);
    return session;
  } catch {
    clearSession();
    return null;
  }
};

const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(CRYPTO_KEY_SESSION);
  clearSessionContext();
};

const cleanupLocalAuthState = (): void => {
  clearSession();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: true,
    error: null,
  });
};

function broadcastAuthSync(message: AuthSyncMessage): void {
  if (!authBroadcastChannel) return;
  authBroadcastChannel.postMessage(message);
}

// ── RPC response types ───────────────────────────────────────────

/** Row returned by the `verify_user_pin` Supabase RPC. */
interface VerifyUserPinRow {
  user_id: string;
  user_role: string;
}

async function restoreSessionWithRetry(
  session: KaryoSession,
  set: (partial: Partial<AuthStore>) => void,
): Promise<boolean> {
  const maxRetries = 3;
  const delays = [500, 1000, 2000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await supabase.rpc('set_session_context', {
        p_user_id: session.user_id,
        p_role: session.role,
      });

      const { data: userData, error } = await supabase
        .rpc('get_user_by_id', { p_user_id: session.user_id })
        .single();

      if (error || !userData) {
        clearSession();
        set({ isLoading: false, isInitialized: true });
        return false;
      }

      const user = userData as User;
      set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
      return true;
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      } else {
        clearSession();
        const errorMsg = err instanceof Error ? err.message : 'Session restore failed';
        set({ isLoading: false, isInitialized: true, error: errorMsg });
      }
    }
  }

  return false;
}

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
      // Step 1: Verify PIN and get user_id, user_role
      const { data, error } = await supabase.rpc('verify_user_pin', { p_nrp: nrp, p_pin: pin }).maybeSingle();
      if (error) throw new Error('Terjadi kesalahan sistem. Coba lagi nanti.');
      const row = data as VerifyUserPinRow | null;
      if (!row) throw new Error('NRP atau PIN salah. Periksa kembali dan coba lagi.');

      const { user_id, user_role } = row;

      // Step 1b: Bind role/user context for RLS-based queries.
      await supabase.rpc('set_session_context', {
        p_user_id: user_id,
        p_role: user_role,
      });

      // Step 2: Get user data via RPC (not direct select)
      const { data: userData, error: userError } = await supabase.rpc('get_user_by_id', { p_user_id: user_id }).single();
      if (userError || !userData) throw new Error('Data pengguna tidak ditemukan.');

      const user = userData as User;

      // Step 3: Update last_login and is_online via RPC
      await supabase.rpc('update_user_login', {
        p_user_id: user_id,
        p_last_login: new Date().toISOString(),
        p_is_online: true
      });

      // Step 4: Log the login action via RPC
      await supabase.rpc('insert_audit_log', {
        p_user_id: user_id,
        p_action: 'LOGIN',
        p_resource: 'auth',
        p_detail: JSON.stringify({ nrp, role: user_role })
      });

      const sessionPayload: KaryoSession = {
        user_id,
        role: user_role as User['role'],
        expires_at: makeSessionExpiry(),
      };
      await saveSession(sessionPayload);
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      broadcastAuthSync({
        type: 'LOGIN',
        session: sessionPayload,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem. Coba lagi nanti.';
      set({ isLoading: false, error: message, isAuthenticated: false, user: null });
      throw err;
    }
  },

  logout: async () => {
    const { user } = get();
    try {
      if (user) {
        // Try to update is_online and log the action, but don't let failures block cleanup
        try {
          await supabase.rpc('update_user_login', {
            p_user_id: user.id,
            p_is_online: false
          });
        } catch (err) {
          if (import.meta.env.DEV) console.warn('Failed to update is_online:', err);
        }

        try {
          await supabase.rpc('insert_audit_log', {
            p_user_id: user.id,
            p_action: 'LOGOUT',
            p_resource: 'auth',
            p_detail: null
          });
        } catch (err) {
          if (import.meta.env.DEV) console.warn('Failed to insert audit log:', err);
        }
      }
    } finally {
      // Always cleanup session state, regardless of RPC success/failure
      clearSession();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      broadcastAuthSync({ type: 'LOGOUT' });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    const session = await loadSession();
    if (!session) {
      clearSessionContext();
      set({ isLoading: false, isInitialized: true });
      return;
    }
    await restoreSessionWithRetry(session, set);
  },

  updateOnlineStatus: async (status: boolean) => {
    const { user } = get();
    if (!user) return;
    await supabase.rpc('update_user_login', {
      p_user_id: user.id,
      p_is_online: status
    });
    set({ user: { ...user, is_online: status } });
  },
}));

if (typeof window !== 'undefined' && !authSyncListenersBound) {
  authSyncListenersBound = true;
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_KEY && event.newValue === null) {
      cleanupLocalAuthState();
    }
  });

  if (authBroadcastChannel) {
    authBroadcastChannel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
      const message = event.data;
      if (!message) return;

      if (message.type === 'LOGOUT') {
        cleanupLocalAuthState();
        return;
      }

      if (message.type === 'LOGIN') {
        void (async () => {
          try {
            await saveSession(message.session);
            await useAuthStore.getState().restoreSession();
          } catch {
            cleanupLocalAuthState();
          }
        })();
      }
    };
  }
}
