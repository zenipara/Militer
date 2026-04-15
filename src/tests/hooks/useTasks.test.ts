import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTasks, clearTasksCache } from '../../hooks/useTasks';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Task } from '../../types';

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
};

const mockUser = {
  id: 'user-1',
  nrp: '12345',
  nama: 'Komandan A',
  role: 'komandan' as const,
  satuan: 'Satuan A',
  is_active: true,
  is_online: true,
  login_attempts: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTasks: Task[] = [
  {
    id: 't1',
    judul: 'Tugas Pertama',
    status: 'pending',
    prioritas: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 't2',
    judul: 'Tugas Kedua',
    status: 'in_progress',
    prioritas: 2,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

// Build a chainable Supabase query that resolves to `result`
function buildQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.eq = chain;
  q.order = chain;
  q.limit = chain;
  q.update = chain;
  q.insert = chain;
  q.single = () => Promise.resolve(result);
  q.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return q;
}

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTasksCache();
    useAuthStore.setState({ user: mockUser, isAuthenticated: true });

    // Default channel mock
    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
    mockSupabase.removeChannel.mockResolvedValue(undefined);
  });

  it('loads tasks on mount', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: mockTasks, error: null }));

    const { result } = renderHook(() => useTasks());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.tasks[0].judul).toBe('Tugas Pertama');
  });

  it('sets error when fetch fails', async () => {
    mockSupabase.from.mockReturnValue(buildQuery({ data: null, error: new Error('db error') }));

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('db error');
    expect(result.current.tasks).toHaveLength(0);
  });

  it('createTask calls supabase insert with correct data', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = buildQuery({ data: mockTasks, error: null }) as Record<string, unknown>;
    fromMock.insert = insertMock;
    mockSupabase.from.mockReturnValue(fromMock);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createTask({
        judul: 'New Task',
        assigned_to: 'user-2',
        prioritas: 1,
      });
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        judul: 'New Task',
        assigned_to: 'user-2',
        assigned_by: 'user-1',
        status: 'pending',
      })
    );
  });

  it('createTask throws when supabase returns error', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: new Error('insert failed') });
    const fromMock = buildQuery({ data: mockTasks, error: null }) as Record<string, unknown>;
    fromMock.insert = insertMock;
    mockSupabase.from.mockReturnValue(fromMock);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.createTask({ judul: 'Bad', assigned_to: 'u2', prioritas: 2 });
      })
    ).rejects.toThrow('insert failed');
  });

  it('approveTask calls updateTaskStatus with approved', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = buildQuery({ data: mockTasks, error: null }) as Record<string, unknown>;
    fromMock.update = updateMock;
    mockSupabase.from.mockReturnValue(fromMock);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.approveTask('t1');
    });

    expect(updateMock).toHaveBeenCalledWith({ status: 'approved' });
    expect(eqMock).toHaveBeenCalledWith('id', 't1');
  });

  it('rejectTask saves rejection note and sets status to in_progress', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tasks') {
        const q = buildQuery({ data: mockTasks, error: null }) as Record<string, unknown>;
        q.update = updateMock;
        return q;
      }
      if (table === 'task_reports') {
        return { insert: insertMock };
      }
      return buildQuery({ data: null, error: null });
    });

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.rejectTask('t1', 'Revisi diperlukan');
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ isi_laporan: '[DITOLAK] Revisi diperlukan' })
    );
    expect(updateMock).toHaveBeenCalledWith({ status: 'in_progress' });
  });

  it('rejectTask without note skips insert', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    const insertMock = vi.fn();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tasks') {
        const q = buildQuery({ data: mockTasks, error: null }) as Record<string, unknown>;
        q.update = updateMock;
        return q;
      }
      if (table === 'task_reports') {
        return { insert: insertMock };
      }
      return buildQuery({ data: null, error: null });
    });

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.rejectTask('t1');
    });

    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({ status: 'in_progress' });
  });

  it('submitTaskReport inserts report and sets status to done', async () => {
    const reportInsertMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tasks') {
        const q = buildQuery({ data: mockTasks, error: null }) as Record<string, unknown>;
        q.update = updateMock;
        return q;
      }
      if (table === 'task_reports') {
        return { insert: reportInsertMock };
      }
      return buildQuery({ data: null, error: null });
    });

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.submitTaskReport('t1', 'Laporan selesai');
    });

    expect(reportInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ isi_laporan: 'Laporan selesai', task_id: 't1' })
    );
    expect(updateMock).toHaveBeenCalledWith({ status: 'done' });
  });

  it('getTaskReport fetches the latest report for a task', async () => {
    const mockReport = { id: 'r1', task_id: 't1', isi_laporan: 'report' };
    const singleMock = vi.fn().mockResolvedValue({ data: mockReport });
    const limitMock = vi.fn().mockReturnValue({ single: singleMock });
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'task_reports') return { select: selectMock };
      return buildQuery({ data: mockTasks, error: null });
    });

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let report: unknown;
    await act(async () => {
      report = await result.current.getTaskReport('t1');
    });

    expect(report).toEqual(mockReport);
  });
});
