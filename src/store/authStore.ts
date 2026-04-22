import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { clearSessionContext, readSessionContext, writeSessionContext } from '../lib/sessionContext';
import { normalizeRole } from '../lib/rolePermissions';
import type { User, KaryoSession } from '../types';

const SESSION_KEY = 'karyo_session';
const CRYPTO_KEY_SESSION = 'karyo_session_key';
const SESSION_DURATION_HOURS = 12; // Extended from 8 to 12 hours
const AUTH_BROADCAST_CHANNEL = 'karyo_auth_sync';

type AuthSyncMessage =
  | { type: 'LOGIN'; session: KaryoSession }
  | { type: 'LOGOUT' };

const AUTH_LISTENERS_INITIALIZED_KEY = '__karyo_auth_sync_bound__';
let authBroadcastChannel: BroadcastChannel | null = null;

function getAuthBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  if (!authBroadcastChannel) {
    authBroadcastChannel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
  }
  return authBroadcastChannel;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  requiresPinChange: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (nrp: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  completeForceChangePin: (newPin: string) => Promise<void>;
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
  if (!raw) {
    const fallbackSession = readSessionContext();
    if (fallbackSession) {
      writeSessionContext(fallbackSession);
      if (import.meta.env.DEV) console.log('[AUTH] Using session context fallback');
      return fallbackSession;
    }
    return null;
  }
  
  const key = await loadStoredKey();
  if (!key) {
    // Fall back to session context when tab-scoped crypto key is unavailable.
    const fallbackSession = readSessionContext();
    if (fallbackSession) {
      writeSessionContext(fallbackSession);
      if (import.meta.env.DEV) console.log('[AUTH] Using session context (crypto key unavailable)');
      return fallbackSession;
    }

    // No recoverable session remains
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
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[AUTH] Failed to decrypt session:', err instanceof Error ? err.message : String(err));
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
    requiresPinChange: false,
    isLoading: false,
    isInitialized: true,
    error: null,
  });
};

function broadcastAuthSync(message: AuthSyncMessage): void {
  const channel = getAuthBroadcastChannel();
  if (!channel) return;
  channel.postMessage(message);
}

// ── RPC response types ───────────────────────────────────────────

/** Row returned by the `verify_user_pin` Supabase RPC. */
interface VerifyUserPinRow {
  user_id: string;
  user_role: string;
  force_change_pin: boolean;
}

async function restoreSessionWithRetry(
  session: KaryoSession,
  set: (partial: Partial<AuthStore>) => void,
): Promise<boolean> {
  const maxRetries = 2;
  const delays = [300, 700];

  // Helper: check if error is transient (should retry) vs permanent (should fail-fast)
  const isTransientError = (err: unknown): boolean => {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    // Retry on network/timeout errors only
    return msg.includes('network') || msg.includes('timeout') || msg.includes('fetch') || msg.includes('connection');
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (import.meta.env.DEV) console.log(`[AUTH] Restore attempt ${attempt + 1}/${maxRetries}`);
      
      await supabase.rpc('set_session_context', {
        p_user_id: session.user_id,
        p_role: normalizeRole(session.role) ?? session.role,
      });

      const { data: userData, error } = await supabase
        .rpc('get_user_by_id', { p_user_id: session.user_id })
        .single();

      if (error || !userData) {
        if (import.meta.env.DEV) console.error('[AUTH] get_user_by_id failed:', error);
        clearSession();
        set({ isLoading: false, isInitialized: true });
        return false;
      }

      const user = {
        ...(userData as User),
        role: (normalizeRole((userData as User).role) ?? (userData as User).role) as User['role'],
      };

      // Automatically refresh session expiry on successful restore
      const refreshedSession: KaryoSession = {
        ...session,
        expires_at: makeSessionExpiry(),
      };

      // Try to update presence (non-critical failure)
      try {
        await supabase.rpc('update_user_login', {
          p_user_id: session.user_id,
          p_is_online: true,
        });
      } catch (presenceErr) {
        if (import.meta.env.DEV) {
          console.warn('[AUTH] Failed to refresh online presence on restore:', presenceErr);
        }
      }

      // Re-save session with refreshed expiry
      await saveSession(refreshedSession);

      set({
        user,
        isAuthenticated: true,
        requiresPinChange: Boolean(user.force_change_pin),
        isLoading: false,
        isInitialized: true,
      });
      if (import.meta.env.DEV) console.log('[AUTH] Session restored successfully and refreshed');
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) console.warn(`[AUTH] Restore attempt ${attempt + 1} failed: ${errorMsg}`);
      
      // Fail-fast on permanent errors (e.g., user not found, RLS policy denial)
      if (!isTransientError(err)) {
        if (import.meta.env.DEV) console.error('[AUTH] Permanent error during restore, giving up:', errorMsg);
        clearSession();
        set({ isLoading: false, isInitialized: true, error: `Session restore failed: ${errorMsg}` });
        return false;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = delays[attempt];
        if (import.meta.env.DEV) console.log(`[AUTH] Transient error, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // All retries exhausted
        if (import.meta.env.DEV) console.error('[AUTH] All restore attempts failed');
        clearSession();
        set({ isLoading: false, isInitialized: true, error: `Session restore failed: ${errorMsg}` });
      }
    }
  }

  return false;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  requiresPinChange: false,
  isLoading: true,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (nrp: string, pin: string) => {
    set({ isLoading: true, error: null });
    try {
      if (import.meta.env.DEV) console.log('[AUTH] Login attempt for NRP:', nrp);
      
      // Step 1: Verify PIN and get user_id, user_role
      const { data, error } = await supabase.rpc('verify_user_pin', { p_nrp: nrp, p_pin: pin }).maybeSingle();
      if (error) {
        const msg = 'Terjadi kesalahan sistem. Coba lagi nanti.';
        if (import.meta.env.DEV) console.error('[AUTH] verify_user_pin error:', error);
        throw new Error(msg);
      }
      const row = data as VerifyUserPinRow | null;
      if (!row) throw new Error('NRP atau PIN salah. Periksa kembali dan coba lagi.');

      const { user_id, user_role, force_change_pin } = row;
      if (import.meta.env.DEV) console.log('[AUTH] PIN verified for user_id:', user_id);

      // Step 1b: Bind role/user context for RLS-based queries.
      const normalizedRole = normalizeRole(user_role) ?? user_role;
      await supabase.rpc('set_session_context', {
        p_user_id: user_id,
        p_role: normalizedRole,
      });

      // Step 2: Get user data via RPC (not direct select)
      const { data: userData, error: userError } = await supabase.rpc('get_user_by_id', { p_user_id: user_id }).single();
      if (userError || !userData) {
        if (import.meta.env.DEV) console.error('[AUTH] get_user_by_id error:', userError);
        throw new Error('Data pengguna tidak ditemukan.');
      }

      const user = {
        ...(userData as User),
        role: (normalizeRole((userData as User).role) ?? (userData as User).role) as User['role'],
      };

      // Step 3: Update last_login and is_online via RPC
      await supabase.rpc('update_user_login', {
        p_user_id: user_id,
        p_last_login: new Date().toISOString(),
        p_is_online: true
      });

      // Step 4: Log the login action via RPC (non-critical, don't fail on error)
      try {
        await supabase.rpc('insert_audit_log', {
          p_user_id: user_id,
          p_action: 'LOGIN',
          p_resource: 'auth',
          p_detail: JSON.stringify({ nrp, role: user_role })
        });
      } catch (auditErr) {
        if (import.meta.env.DEV) console.warn('[AUTH] Failed to insert audit log:', auditErr);
      }

      const sessionPayload: KaryoSession = {
        user_id,
        role: normalizedRole as User['role'],
        expires_at: makeSessionExpiry(),
      };
      await saveSession(sessionPayload);
      set({
        user,
        isAuthenticated: true,
        requiresPinChange: force_change_pin || Boolean(user.force_change_pin),
        isLoading: false,
        error: null,
      });
      broadcastAuthSync({
        type: 'LOGIN',
        session: sessionPayload,
      });
      if (import.meta.env.DEV) console.log('[AUTH] Login successful');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem. Coba lagi nanti.';
      if (import.meta.env.DEV) console.error('[AUTH] Login failed:', message);
      set({ isLoading: false, error: message, isAuthenticated: false, user: null, requiresPinChange: false });
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
      set({ user: null, isAuthenticated: false, requiresPinChange: false, isLoading: false, error: null });
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

  completeForceChangePin: async (newPin: string) => {
    const { user } = get();
    if (!user) {
      throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
    }

    const { error } = await supabase.rpc('complete_force_change_pin', {
      p_new_pin: newPin,
    });

    if (error) {
      throw error;
    }

    const nextUser = {
      ...user,
      force_change_pin: false,
    };
    set({ user: nextUser, requiresPinChange: false });
  },

  updateOnlineStatus: async (status: boolean) => {
    const { user } = get();
    if (!user) return;
    // Optimistically update UI state first so frontend status stays responsive.
    set({ user: { ...user, is_online: status } });

    try {
      await supabase.rpc('update_user_login', {
        p_user_id: user.id,
        p_is_online: status,
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('Failed to sync online status to Supabase:', err);
      }
    }
  },
}));

if (typeof window !== 'undefined') {
  const globalWindow = window as Window & {
    [AUTH_LISTENERS_INITIALIZED_KEY]?: boolean;
  };
  if (!globalWindow[AUTH_LISTENERS_INITIALIZED_KEY]) {
    globalWindow[AUTH_LISTENERS_INITIALIZED_KEY] = true;

    window.addEventListener('storage', (event) => {
      // Monitor encrypted session key removal to sync logout across tabs
      if (event.key === SESSION_KEY && event.newValue === null) {
        if (import.meta.env.DEV) console.log('[AUTH] Session cleared from storage event, cleaning up local state');
        cleanupLocalAuthState();
      }
      // Also handle explicit logout trigger via storage
      if (event.key === 'KARYO_FORCE_LOGOUT' && event.newValue === 'true') {
        if (import.meta.env.DEV) console.log('[AUTH] Force logout signal received');
        cleanupLocalAuthState();
        localStorage.removeItem('KARYO_FORCE_LOGOUT');
      }
    });

    const authChannel = getAuthBroadcastChannel();
    if (authChannel) {
      authChannel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
        const message = event.data;
        if (!message) return;

        if (message.type === 'LOGOUT') {
          if (import.meta.env.DEV) console.log('[AUTH] Logout broadcast received');
          cleanupLocalAuthState();
          return;
        }

        if (message.type === 'LOGIN') {
          if (import.meta.env.DEV) console.log('[AUTH] Login broadcast received, syncing session');
          void (async () => {
            try {
              await saveSession(message.session);
              await useAuthStore.getState().restoreSession();
            } catch (err) {
              if (import.meta.env.DEV) console.error('[AUTH] Failed to sync login broadcast:', err);
              cleanupLocalAuthState();
            }
          })();
        }
      };
    }
  }
}
