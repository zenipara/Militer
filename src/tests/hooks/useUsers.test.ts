import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUsers } from '../../hooks/useUsers';
import { supabase } from '../../lib/supabase';
import type { User } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
};

const mockUsers: User[] = [
  {
    id: 'u1',
    nrp: '11111',
    nama: 'Alpha',
    role: 'prajurit',
    satuan: 'Satuan A',
    is_active: true,
    is_online: false,
    login_attempts: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'u2',
    nrp: '22222',
    nama: 'Bravo',
    role: 'komandan',
    satuan: 'Satuan B',
    is_active: false,
    is_online: false,
    login_attempts: 0,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.update = chain;
  q.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return q;
}

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads users on mount', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: mockUsers, error: null }));

    const { result } = renderHook(() => useUsers());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toHaveLength(2);
    expect(result.current.users[0].nama).toBe('Alpha');
  });

  it('sets error when fetch fails', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('connection refused') }));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('connection refused');
    expect(result.current.users).toHaveLength(0);
  });

  it('returns empty list and no error for empty dataset', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: [], error: null }));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  describe('createUser', () => {
    it('calls create_user_with_pin RPC with correct args', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: mockUsers, error: null }));
      mockSupabase.rpc.mockResolvedValue({ data: 'new-id', error: null });

      const { result } = renderHook(() => useUsers());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createUser({
          nrp: '33333',
          pin: '5678',
          nama: 'Charlie',
          role: 'prajurit',
          satuan: 'Satuan C',
          is_active: true,
          locked_until: undefined,
          last_login: undefined,
          foto_url: undefined,
        });
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'create_user_with_pin',
        expect.objectContaining({
          p_nrp: '33333',
          p_pin: '5678',
          p_nama: 'Charlie',
          p_role: 'prajurit',
          p_satuan: 'Satuan C',
        })
      );
    });

    it('throws when RPC returns error', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: mockUsers, error: null }));
      mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('rpc error') });

      const { result } = renderHook(() => useUsers());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.createUser({
            nrp: '33333',
            pin: '5678',
            nama: 'Charlie',
            role: 'prajurit',
            satuan: 'Satuan C',
            is_active: true,
          });
        })
      ).rejects.toThrow('rpc error');
    });
  });

  describe('updateUser', () => {
    it('calls supabase update with correct fields', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const fromMock = buildQuery({ data: mockUsers, error: null }) as Record<string, unknown>;
      fromMock.update = updateMock;
      mockSupabase.from.mockReturnValue(fromMock);

      const { result } = renderHook(() => useUsers());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateUser('u1', { nama: 'Alpha Updated' });
      });

      expect(updateMock).toHaveBeenCalledWith({ nama: 'Alpha Updated' });
      expect(eqMock).toHaveBeenCalledWith('id', 'u1');
    });

    it('throws when update returns error', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: new Error('update failed') });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const fromMock = buildQuery({ data: mockUsers, error: null }) as Record<string, unknown>;
      fromMock.update = updateMock;
      mockSupabase.from.mockReturnValue(fromMock);

      const { result } = renderHook(() => useUsers());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.updateUser('u1', { nama: 'Fail' });
        })
      ).rejects.toThrow('update failed');
    });
  });

  describe('toggleUserActive', () => {
    it('calls updateUser with is_active flag', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const fromMock = buildQuery({ data: mockUsers, error: null }) as Record<string, unknown>;
      fromMock.update = updateMock;
      mockSupabase.from.mockReturnValue(fromMock);

      const { result } = renderHook(() => useUsers());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.toggleUserActive('u2', true);
      });

      expect(updateMock).toHaveBeenCalledWith({ is_active: true });
    });
  });

  describe('resetUserPin', () => {
    it('calls reset_user_pin RPC', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: mockUsers, error: null }));
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useUsers());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.resetUserPin('u1', '9999');
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('reset_user_pin', {
        p_user_id: 'u1',
        p_new_pin: '9999',
      });
    });

    it('throws when RPC returns error', async () => {
      mockSupabase.from.mockReturnValue(buildQuery({ data: mockUsers, error: null }));
      mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('pin reset failed') });

      const { result } = renderHook(() => useUsers());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.resetUserPin('u1', '0000');
        })
      ).rejects.toThrow('pin reset failed');
    });
  });
});
