import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAttendance } from '../../hooks/useAttendance';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Attendance } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
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

const today = new Date().toISOString().split('T')[0];

const mockAttendances: Attendance[] = [
  {
    id: 'a1',
    user_id: 'user-1',
    tanggal: today,
    status: 'hadir',
    created_at: '2024-01-01T07:00:00Z',
  },
];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.limit = chain;
  q.update = chain;
  q.upsert = chain;
  q.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return q;
}

describe('useAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });

    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
    mockSupabase.removeChannel.mockResolvedValue(undefined);
  });

  it('loads attendance records on mount', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: mockAttendances, error: null }));

    const { result } = renderHook(() => useAttendance());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.attendances).toHaveLength(1);
    expect(result.current.todayAttendance?.tanggal).toBe(today);
  });

  it('sets error on fetch failure', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('fetch error') }));

    const { result } = renderHook(() => useAttendance());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('fetch error');
  });

  it('todayAttendance is null when no record for today exists', async () => {
    const pastRecord: Attendance = {
      id: 'a2',
      user_id: 'user-1',
      tanggal: '2020-01-01',
      status: 'hadir',
      created_at: '2020-01-01T07:00:00Z',
    };
    mockSupabase.from.mockReturnValue(buildQuery({ data: [pastRecord], error: null }));

    const { result } = renderHook(() => useAttendance());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.todayAttendance).toBeNull();
  });

  describe('checkIn', () => {
    it('throws if already checked in today', async () => {
      const checkedIn: Attendance = { ...mockAttendances[0], check_in: '2024-01-01T07:00:00Z' };
      mockSupabase.from.mockReturnValue(buildQuery({ data: [checkedIn], error: null }));

      const { result } = renderHook(() => useAttendance());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => { await result.current.checkIn(); })
      ).rejects.toThrow('Sudah check-in hari ini');
    });

    it('calls upsert when no prior check-in', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue(buildQuery({ data: mockAttendances, error: null }));

      const { result } = renderHook(() => useAttendance());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => { await result.current.checkIn(); });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('server_checkin', { p_user_id: 'user-1' });
    });
  });

  describe('checkOut', () => {
    it('throws if not checked in', async () => {
      // No check_in on today's record
      mockSupabase.from.mockReturnValue(buildQuery({ data: mockAttendances, error: null }));

      const { result } = renderHook(() => useAttendance());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => { await result.current.checkOut(); })
      ).rejects.toThrow('Belum check-in hari ini');
    });

    it('throws if already checked out', async () => {
      const checkedOut: Attendance = {
        ...mockAttendances[0],
        check_in: '2024-01-01T07:00:00Z',
        check_out: '2024-01-01T16:00:00Z',
      };
      mockSupabase.from.mockReturnValue(buildQuery({ data: [checkedOut], error: null }));

      const { result } = renderHook(() => useAttendance());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        act(async () => { await result.current.checkOut(); })
      ).rejects.toThrow('Sudah check-out hari ini');
    });

    it('calls update with check_out when valid', async () => {
      const checkedIn: Attendance = {
        ...mockAttendances[0],
        check_in: '2024-01-01T07:00:00Z',
      };
      mockSupabase.rpc.mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue(buildQuery({ data: [checkedIn], error: null }));

      const { result } = renderHook(() => useAttendance());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => { await result.current.checkOut(); });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('server_checkout', { p_user_id: 'user-1' });
    });
  });

  it('throws when no user is set', async () => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    mockSupabase.from.mockReturnValue(buildQuery({ data: [], error: null }));

    // When targetUserId is null, fetchAttendance returns early without
    // setting isLoading=false, so we don't wait for it — just invoke checkIn
    const { result } = renderHook(() => useAttendance());

    await expect(
      act(async () => { await result.current.checkIn(); })
    ).rejects.toThrow('User tidak ditemukan');
  });
});
