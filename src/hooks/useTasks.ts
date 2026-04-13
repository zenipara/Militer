import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Task, TaskStatus } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseTasksOptions {
  assignedTo?: string;
  assignedBy?: string;
  status?: TaskStatus;
  satuan?: string;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('tasks')
        .select('*, assignee:assigned_to(id,nama,nrp,pangkat), assigner:assigned_by(id,nama,nrp)')
        .order('created_at', { ascending: false });

      if (options.assignedTo) query = query.eq('assigned_to', options.assignedTo);
      if (options.assignedBy) query = query.eq('assigned_by', options.assignedBy);
      if (options.status) query = query.eq('status', options.status);
      if (options.satuan) query = query.eq('satuan', options.satuan);

      const { data, error: err } = await query;
      if (err) throw err;
      setTasks((data as Task[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data tugas');
    } finally {
      setIsLoading(false);
    }
  }, [options.assignedTo, options.assignedBy, options.status, options.satuan]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const filter = options.assignedTo ? `assigned_to=eq.${options.assignedTo}` : undefined;
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter }, () => {
        void fetchTasks();
      })
      .subscribe();
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
    const { error } = await supabase.from('tasks').insert({
      ...taskData,
      assigned_by: user?.id,
      status: 'pending',
    });
    if (error) throw error;
    await fetchTasks();
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
    if (error) throw error;
    await fetchTasks();
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
      await supabase.from('task_reports').insert({
        task_id: taskId,
        user_id: user?.id,
        isi_laporan: `[DITOLAK] ${catatan.trim()}`,
      });
    }
    await updateTaskStatus(taskId, 'in_progress');
  };

  const submitTaskReport = async (taskId: string, isiLaporan: string, fileUrl?: string) => {
    const { error: reportError } = await supabase.from('task_reports').insert({
      task_id: taskId,
      user_id: user?.id,
      isi_laporan: isiLaporan,
      file_url: fileUrl,
    });
    if (reportError) throw reportError;

    await updateTaskStatus(taskId, 'done');
  };

  /**
   * Fetch the most recent task report for a given task_id (for approval review).
   */
  const getTaskReport = async (taskId: string) => {
    const { data } = await supabase
      .from('task_reports')
      .select('*')
      .eq('task_id', taskId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();
    return data;
  };

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTaskStatus,
    approveTask,
    rejectTask,
    submitTaskReport,
    getTaskReport,
  };
}
