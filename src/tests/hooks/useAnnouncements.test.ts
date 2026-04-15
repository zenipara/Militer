import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import type { Announcement } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
};

const mockUser = {
  id: 'u1', nrp: '11111', nama: 'Admin A', role: 'admin' as const,
  satuan: 'Satuan X', is_active: true, is_online: true, login_attempts: 0,
  created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
};

const sampleAnnouncements: Announcement[] = [
  { id: 'a1', judul: 'Pengumuman Upacara', isi: 'Besok ada upacara', is_pinned: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'a2', judul: 'Jadwal Piket', isi: 'Piket minggu ini', is_pinned: false, created_at: '2024-01-02T00:00:00Z' },
];

function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.update = vi.fn(() => q);
  q.insert = vi.fn(() => Promise.resolve(result));
  q.delete = vi.fn(() => q);
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  q.catch = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
  return q;
}

describe('useAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });
  });

  it('loads announcements on mount', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: sampleAnnouncements, error: null }));

    const { result } = renderHook(() => useAnnouncements());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.announcements).toHaveLength(2);
    expect(result.current.announcements[0].judul).toBe('Pengumuman Upacara');
  });

  it('sets error when fetch fails', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('fetch error') }));

    const { result } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('fetch error');
    expect(result.current.announcements).toHaveLength(0);
  });

  it('returns empty list for empty dataset', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: [], error: null }));

    const { result } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.announcements).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  describe('createAnnouncement', () => {
    it('calls insert and refreshes list', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      const q = buildQuery({ data: sampleAnnouncements, error: null }) as Record<string, unknown>;
      q.insert = insertMock;
      mockSupabase.from.mockReturnValue(q);

      const { result } = renderHook(() => useAnnouncements());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createAnnouncement({
          judul: 'Baru',
          isi: 'Isi baru',
        });
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ judul: 'Baru', created_by: 'u1' })
      );
    });
  });

  describe('updateAnnouncement', () => {
    it('calls update and refreshes list', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: sampleAnnouncements, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      const { result } = renderHook(() => useAnnouncements());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateAnnouncement('a1', { judul: 'Updated' });
      });

      expect(updateMock).toHaveBeenCalledWith({ judul: 'Updated' });
      expect(eqMock).toHaveBeenCalledWith('id', 'a1');
    });
  });

  describe('deleteAnnouncement', () => {
    it('calls delete with correct id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: sampleAnnouncements, error: null }) as Record<string, unknown>;
      q.delete = deleteMock;
      mockSupabase.from.mockReturnValue(q);

      const { result } = renderHook(() => useAnnouncements());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteAnnouncement('a2');
      });

      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'a2');
    });
  });

  describe('togglePin', () => {
    it('toggles is_pinned for an announcement', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      const q = buildQuery({ data: sampleAnnouncements, error: null }) as Record<string, unknown>;
      q.update = updateMock;
      mockSupabase.from.mockReturnValue(q);

      const { result } = renderHook(() => useAnnouncements());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Toggle from false to true
      await act(async () => {
        await result.current.togglePin('a2', false);
      });

      expect(updateMock).toHaveBeenCalledWith({ is_pinned: true });

      // Toggle from true to false
      await act(async () => {
        await result.current.togglePin('a1', true);
      });

      expect(updateMock).toHaveBeenCalledWith({ is_pinned: false });
    });
  });

  it('refetch re-fetches announcements', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: sampleAnnouncements, error: null }));

    const { result } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = (mockSupabase.from as ReturnType<typeof vi.fn>).mock.calls.length;

    await act(async () => {
      await result.current.refetch();
    });

    expect((mockSupabase.from as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
