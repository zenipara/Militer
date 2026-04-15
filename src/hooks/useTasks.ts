import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchTasks as apiFetchTasks, insertTask, patchTaskStatus, insertTaskReport, fetchLatestTaskReport } from '../lib/api/tasks';
import { handleError } from '../lib/handleError';
import { SimpleCache } from '../lib/cache';
import type { Task, TaskStatus } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseTasksOptions {
  assignedTo?: string;
  assignedBy?: string;
  status?: TaskStatus;
  satuan?: string;
}

/** Module-level cache: data tasks di-cache 5 menit per kombinasi filter */
const tasksCache = new SimpleCache<Task[]>();

function buildCacheKey(opts: UseTasksOptions): string {
  return JSON.stringify({
    a: opts.assignedTo ?? '',
    b: opts.assignedBy ?? '',
    s: opts.status ?? '',
    t: opts.satuan ?? '',
  });
}

/** Hapus semua cache tugas — berguna untuk pengujian unit. */
export function clearTasksCache(): void {
  tasksCache.clear();
}

export function useTasks(options: UseTasksOptions = {}) {
  const { user } = useAuthStore();
  const cacheKey = buildCacheKey(options);

  // Seed initial state from cache so the list renders immediately on revisit
  const [tasks, setTasks] = useState<Task[]>(() => tasksCache.get(cacheKey) ?? []);
  const [isLoading, setIsLoading] = useState(() => !tasksCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (force = false) => {
    if (!force) {
      const cached = tasksCache.get(cacheKey);
      if (cached) {
        setTasks(cached);
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetchTasks({
        assignedTo: options.assignedTo,
        assignedBy: options.assignedBy,
        status: options.status,
        satuan: options.satuan,
      });
      tasksCache.set(cacheKey, data);
      setTasks(data);
    } catch (err) {
      setError(handleError(err, 'Gagal memuat data tugas'));
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, options.assignedTo, options.assignedBy, options.status, options.satuan]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const filter = options.assignedTo ? `assigned_to=eq.${options.assignedTo}` : undefined;
    const channel = supabase.channel('tasks-changes');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter }, () => {
      void fetchTasks();
    });
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, options.assignedTo, fetchTasks]);

  const createTask = async (taskData: {
    judul: string;
    deskripsi?: string;
    assigned_to: string;
    deadline?: string;
    prioritas: 1 | 2 | 3;
    satuan?: string;
  }) => {
    await insertTask({ ...taskData, assigned_by: user?.id });
    tasksCache.invalidate(cacheKey);
    await fetchTasks(true);
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    await patchTaskStatus(taskId, status);
    tasksCache.invalidate(cacheKey);
    await fetchTasks(true);
  };

  /**
   * Approve a task: status → 'approved' and log the action.
   */
  const approveTask = async (taskId: string) => {
    await updateTaskStatus(taskId, 'approved');
  };

  /**
   * Reject a task per spec §8.3: status reverts to 'in_progress' so the
   * prajurit can revise and resubmit. An optional rejection note is saved
   * as a new task_report row (type = 'rejection').
   */
  const rejectTask = async (taskId: string, catatan?: string) => {
    if (catatan?.trim()) {
      await insertTaskReport({
        task_id: taskId,
        user_id: user?.id,
        isi_laporan: `[DITOLAK] ${catatan.trim()}`,
      });
    }
    await updateTaskStatus(taskId, 'in_progress');
  };

  const submitTaskReport = async (taskId: string, isiLaporan: string, fileUrl?: string) => {
    await insertTaskReport({ task_id: taskId, user_id: user?.id, isi_laporan: isiLaporan, file_url: fileUrl });
    await updateTaskStatus(taskId, 'done');
  };

  /**
   * Fetch the most recent task report for a given task_id (for approval review).
   */
  const getTaskReport = async (taskId: string) => {
    return fetchLatestTaskReport(taskId);
  };

  return {
    tasks,
    isLoading,
    error,
    refetch: () => fetchTasks(true),
    createTask,
    updateTaskStatus,
    approveTask,
    rejectTask,
    submitTaskReport,
    getTaskReport,
  };
}
