import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

const mockSupabase = supabase as {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

// Helper: build a chainable Supabase query mock that resolves to `result`
function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.update = chain;
  q.insert = chain;
  q.single = () => Promise.resolve(result);
  // Make the builder itself thenable so `await supabase.from(...).select(...)...` works
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

const SESSION_KEY = 'karyo_session';

function makeValidSession(userId = 'u1', role = 'admin') {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);
  return JSON.stringify({ user_id: userId, role, expires_at: expiresAt.toISOString() });
}

function makeExpiredSession() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() - 1);
  return JSON.stringify({ user_id: 'u1', role: 'admin', expires_at: expiresAt.toISOString() });
}

const mockUser = {
  id: 'u1',
  nrp: '12345',
  nama: 'Test User',
  role: 'admin' as const,
  satuan: 'Satuan A',
  is_active: true,
  is_online: false,
  login_attempts: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  // ── restoreSession ─────────────────────────────────────────
  describe('restoreSession', () => {
    it('sets isLoading false when no session in localStorage', async () => {
      await act(async () => {
        await useAuthStore.getState().restoreSession();
      });
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('clears session and does not authenticate if session is expired', async () => {
      localStorage.setItem(SESSION_KEY, makeExpiredSession());
      await act(async () => {
        await useAuthStore.getState().restoreSession();
      });
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('clears session if user fetch fails', async () => {
      localStorage.setItem(SESSION_KEY, makeValidSession());
      mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('db error') }));

      await act(async () => {
        await useAuthStore.getState().restoreSession();
      });
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('restores user and sets isAuthenticated when session is valid', async () => {
      localStorage.setItem(SESSION_KEY, makeValidSession('u1', 'admin'));
      mockSupabase.from.mockReturnValue(buildQuery({ data: mockUser, error: null }));

      await act(async () => {
        await useAuthStore.getState().restoreSession();
      });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.id).toBe('u1');
    });

    it('handles malformed JSON session gracefully', async () => {
      localStorage.setItem(SESSION_KEY, 'not-valid-json');
      await act(async () => {
        await useAuthStore.getState().restoreSession();
      });
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ── logout ────────────────────────────────────────────────
  describe('logout', () => {
    it('clears user and session when logged in', async () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      localStorage.setItem(SESSION_KEY, makeValidSession());
      const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ update: updateMock, insert: insertMock });

      await act(async () => {
        await useAuthStore.getState().logout();
      });
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('clears state even when no user is logged in', async () => {
      await act(async () => {
        await useAuthStore.getState().logout();
      });
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ── clearError ────────────────────────────────────────────
  describe('clearError', () => {
    it('clears error state', () => {
      useAuthStore.setState({ error: 'some error' });
      act(() => useAuthStore.getState().clearError());
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // ── updateOnlineStatus ────────────────────────────────────
  describe('updateOnlineStatus', () => {
    it('updates user is_online in store', async () => {
      useAuthStore.setState({ user: { ...mockUser, is_online: false } });
      const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await act(async () => {
        await useAuthStore.getState().updateOnlineStatus(true);
      });
      expect(useAuthStore.getState().user?.is_online).toBe(true);
    });

    it('does nothing if no user is set', async () => {
      useAuthStore.setState({ user: null });
      // should not throw
      await act(async () => {
        await useAuthStore.getState().updateOnlineStatus(true);
      });
    });
  });

  // ── login ─────────────────────────────────────────────────
  describe('login', () => {
    it('sets error state on wrong credentials', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [], error: null })  // verify_user_pin → empty
        .mockResolvedValue({ data: null, error: null });    // increment_login_attempts

      let thrown = false;
      await act(async () => {
        try {
          await useAuthStore.getState().login('99999', '0000');
        } catch {
          thrown = true;
        }
      });

      expect(thrown).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().error).toContain('NRP atau PIN salah');
    });

    it('sets error state on system error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('db error') });

      await expect(
        act(async () => {
          await useAuthStore.getState().login('99999', '0000');
        })
      ).rejects.toThrow();

      expect(useAuthStore.getState().error).toContain('kesalahan sistem');
    });

    it('authenticates on successful login', async () => {
      // verify_user_pin returns a result
      mockSupabase.rpc.mockResolvedValue({ data: [{ user_id: 'u1' }], error: null });
      // Build a from mock that handles all chained calls
      const fromMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: mockUser, error: null }).then(resolve),
      };
      mockSupabase.from.mockReturnValue(fromMock);

      await act(async () => {
        await useAuthStore.getState().login('12345', '1234');
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.id).toBe('u1');
      expect(localStorage.getItem('karyo_session')).not.toBeNull();
    });
  });
});
