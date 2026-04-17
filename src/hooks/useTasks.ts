import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { fetchTasks as apiFetchTasks, insertTask, patchTaskStatus, insertTaskReport, fetchLatestTaskReport } from '../lib/api/tasks';
import { handleError } from '../lib/handleError';
import { SimpleCache, buildCacheKey } from '../lib/cache';
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

/** Hapus semua cache tugas — berguna untuk pengujian unit. */
export function clearTasksCache(): void {
  tasksCache.clear();
}

export function useTasks(options: UseTasksOptions = {}) {
  const { user } = useAuthStore();

  // Stabilize cacheKey so it only changes when the option values change (not object references)
  const cacheKey = useMemo(
    () => buildCacheKey({ a: options.assignedTo, b: options.assignedBy, s: options.status, t: options.satuan }),
    [options.assignedTo, options.assignedBy, options.status, options.satuan],
  );

  // Seed initial state from cache so the list renders immediately on revisit
  const [tasks, setTasks] = useState<Task[]>(() => tasksCache.get(cacheKey) ?? []);
  const [isLoading, setIsLoading] = useState(() => !tasksCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (force = false) => {
    if (!user) return;
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
        callerId: user.id,
        callerRole: user.role,
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
  }, [user, cacheKey, options.assignedTo, options.assignedBy, options.status, options.satuan]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const filter = options.assignedTo ? `assigned_to=eq.${options.assignedTo}` : undefined;
    const channel = supabase.channel('tasks-changes');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter }, () => {
      tasksCache.invalidate(cacheKey);
      void fetchTasks(true);
    });
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, cacheKey, options.assignedTo, fetchTasks]);

  const createTask = async (taskData: {
    judul: string;
    deskripsi?: string;
    assigned_to: string;
    deadline?: string;
    prioritas: 1 | 2 | 3;
    satuan?: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    await insertTask(user.id, user.role, { ...taskData, assigned_by: user.id });
    tasksCache.invalidate(cacheKey);
    await fetchTasks(true);
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!user) throw new Error('Not authenticated');
    await patchTaskStatus(user.id, user.role, taskId, status);
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
    if (!user) throw new Error('Not authenticated');
    if (catatan?.trim()) {
      await insertTaskReport(user.id, user.role, {
        task_id: taskId,
        user_id: user.id,
        isi_laporan: `[DITOLAK] ${catatan.trim()}`,
      });
    }
    await updateTaskStatus(taskId, 'in_progress');
  };

  const submitTaskReport = async (taskId: string, isiLaporan: string, fileUrl?: string) => {
    if (!user) throw new Error('Not authenticated');
    await insertTaskReport(user.id, user.role, { task_id: taskId, user_id: user.id, isi_laporan: isiLaporan, file_url: fileUrl });
    await updateTaskStatus(taskId, 'done');
  };

  /**
   * Fetch the most recent task report for a given task_id (for approval review).
   */
  const getTaskReport = async (taskId: string) => {
    if (!user) return null;
    return fetchLatestTaskReport(user.id, user.role, taskId);
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
