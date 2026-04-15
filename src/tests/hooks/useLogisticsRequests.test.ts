import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLogisticsRequests } from '../../hooks/useLogisticsRequests';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import type { LogisticsRequest } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
};

const mockUser = {
  id: 'u1', nrp: '11111', nama: 'Prajurit A', role: 'prajurit' as const,
  satuan: 'Satuan X', is_active: true, is_online: true, login_attempts: 0,
  created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
};

const sampleRequests: LogisticsRequest[] = [
  {
    id: 'req1', nama_item: 'Peluru', jumlah: 100, satuan_item: 'butir',
    alasan: 'Latihan', requested_by: 'u1', satuan: 'Satuan X',
    status: 'pending', created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'req2', nama_item: 'Seragam', jumlah: 5, satuan_item: 'buah',
    alasan: 'Rusak', requested_by: 'u2', satuan: 'Satuan Y',
    status: 'approved', created_at: '2024-01-02T00:00:00Z',
  },
] as LogisticsRequest[];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.update = vi.fn(() => q);
  q.insert = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

describe('useLogisticsRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });

    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
    mockSupabase.removeChannel.mockResolvedValue(undefined);
  });

  it('loads logistics requests on mount', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: sampleRequests, error: null }));

    const { result } = renderHook(() => useLogisticsRequests());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.requests).toHaveLength(2);
    expect(result.current.requests[0].nama_item).toBe('Peluru');
  });

  it('sets error when fetch fails', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('fetch error') }));

    const { result } = renderHook(() => useLogisticsRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('fetch error');
    expect(result.current.requests).toHaveLength(0);
  });

  it('returns empty list for empty dataset', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: [], error: null }));

    const { result } = renderHook(() => useLogisticsRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.requests).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  describe('submitRequest', () => {
    it('inserts request with correct data and refreshes', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const q = buildQuery({ data: sampleRequests, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      const { result } = renderHook(() => useLogisticsRequests());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submitRequest({
          nama_item: 'Baju', jumlah: 2, alasan: 'Perlu',
        });
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          nama_item: 'Baju', requested_by: 'u1', satuan: 'Satuan X', status: 'pending',
        })
      );
    });

    it('throws when not authenticated', async () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });
      mockSupabase.from.mockReturnValue(buildQuery({ data: [], error: null }));

      const { result } = renderHook(() => useLogisticsRequests());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.submitRequest({ nama_item: 'X', jumlah: 1, alasan: 'Y' });
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('reviewRequest', () => {
    it('updates status to approved with reviewer info', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: sampleRequests, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      const { result } = renderHook(() => useLogisticsRequests());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.reviewRequest('req1', 'approved', 'Disetujui');
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          reviewed_by: 'u1',
          admin_note: 'Disetujui',
        })
      );
    });

    it('throws when not authenticated', async () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });
      mockSupabase.from.mockReturnValue(buildQuery({ data: [], error: null }));

      const { result } = renderHook(() => useLogisticsRequests());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.reviewRequest('req1', 'rejected');
        })
      ).rejects.toThrow('Not authenticated');
    });
  });
});
