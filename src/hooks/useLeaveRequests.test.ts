import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLeaveRequests } from '../hooks/useLeaveRequests';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { LeaveRequest } from '../types';

const mockSupabase = supabase as {
  from: ReturnType<typeof vi.fn>;
};

const mockUser = {
  id: 'user-1',
  nrp: '12345',
  nama: 'Prajurit A',
  role: 'prajurit' as const,
  satuan: 'Satuan A',
  is_active: true,
  is_online: true,
  login_attempts: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockRequests: LeaveRequest[] = [
  {
    id: 'lr1',
    user_id: 'user-1',
    jenis_izin: 'cuti',
    tanggal_mulai: '2024-02-01',
    tanggal_selesai: '2024-02-05',
    alasan: 'Liburan',
    status: 'pending',
    created_at: '2024-01-15T00:00:00Z',
    user: { ...mockUser, satuan: 'Satuan A' },
  },
  {
    id: 'lr2',
    user_id: 'user-2',
    jenis_izin: 'sakit',
    tanggal_mulai: '2024-02-10',
    tanggal_selesai: '2024-02-12',
    alasan: 'Demam',
    status: 'approved',
    created_at: '2024-01-20T00:00:00Z',
    user: { ...mockUser, id: 'user-2', satuan: 'Satuan B' },
  },
];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.update = chain;
  q.insert = chain;
  q.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return q;
}

describe('useLeaveRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
  });

  it('loads leave requests on mount', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: mockRequests, error: null }));

    const { result } = renderHook(() => useLeaveRequests());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.requests).toHaveLength(2);
  });

  it('sets error on fetch failure', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('network error') }));

    const { result } = renderHook(() => useLeaveRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('network error');
  });

  it('filters by satuan via joined user data', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: mockRequests, error: null }));

    const { result } = renderHook(() => useLeaveRequests({ satuan: 'Satuan A' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.requests).toHaveLength(1);
    expect(result.current.requests[0].id).toBe('lr1');
  });

  it('returns all requests when no satuan filter', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: mockRequests, error: null }));

    const { result } = renderHook(() => useLeaveRequests());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.requests).toHaveLength(2);
  });

  describe('submitLeaveRequest', () => {
    it('inserts a leave request with correct data', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const fromMock = buildQuery({ data: mockRequests, error: null }) as Record<string, unknown>;
      fromMock.insert = insertMock;
      mockSupabase.from.mockReturnValue(fromMock);

      const { result } = renderHook(() => useLeaveRequests());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submitLeaveRequest({
          jenis_izin: 'cuti',
          tanggal_mulai: '2024-03-01',
          tanggal_selesai: '2024-03-05',
          alasan: 'Keluarga',
        });
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          status: 'pending',
          jenis_izin: 'cuti',
          alasan: 'Keluarga',
        })
      );
    });

    it('throws when not authenticated', async () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });
      mockSupabase.from.mockReturnValue(buildQuery({ data: [], error: null }));

      const { result } = renderHook(() => useLeaveRequests());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.submitLeaveRequest({
            jenis_izin: 'sakit',
            tanggal_mulai: '2024-03-01',
            tanggal_selesai: '2024-03-03',
            alasan: 'Demam',
          });
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('throws when supabase returns error', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: new Error('insert failed') });
      const fromMock = buildQuery({ data: [], error: null }) as Record<string, unknown>;
      fromMock.insert = insertMock;
      mockSupabase.from.mockReturnValue(fromMock);

      const { result } = renderHook(() => useLeaveRequests());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.submitLeaveRequest({
            jenis_izin: 'cuti',
            tanggal_mulai: '2024-04-01',
            tanggal_selesai: '2024-04-05',
            alasan: 'test',
          });
        })
      ).rejects.toThrow('insert failed');
    });
  });

  describe('reviewLeaveRequest', () => {
    it('updates status to approved with reviewer info', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const fromMock = buildQuery({ data: mockRequests, error: null }) as Record<string, unknown>;
      fromMock.update = updateMock;
      mockSupabase.from.mockReturnValue(fromMock);

      const { result } = renderHook(() => useLeaveRequests());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.reviewLeaveRequest('lr1', 'approved');
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          reviewed_by: 'user-1',
          reviewed_at: expect.any(String),
        })
      );
      expect(eqMock).toHaveBeenCalledWith('id', 'lr1');
    });

    it('throws when not authenticated', async () => {
      useAuthStore.setState({ user: null, isAuthenticated: false });
      mockSupabase.from.mockReturnValue(buildQuery({ data: [], error: null }));

      const { result } = renderHook(() => useLeaveRequests());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => {
          await result.current.reviewLeaveRequest('lr1', 'rejected');
        })
      ).rejects.toThrow('Not authenticated');
    });
  });
});
