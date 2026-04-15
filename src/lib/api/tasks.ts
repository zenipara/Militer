import { supabase } from '../supabase';
import type { Task, TaskReport, TaskStatus } from '../../types';

export interface FetchTasksParams {
  assignedTo?: string;
  assignedBy?: string;
  status?: TaskStatus;
  satuan?: string;
}

export async function fetchTasks(params: FetchTasksParams = {}): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*, assignee:assigned_to(id,nama,nrp,pangkat), assigner:assigned_by(id,nama,nrp)')
    .order('created_at', { ascending: false });

  if (params.assignedTo) query = query.eq('assigned_to', params.assignedTo);
  if (params.assignedBy) query = query.eq('assigned_by', params.assignedBy);
  if (params.status) query = query.eq('status', params.status);
  if (params.satuan) query = query.eq('satuan', params.satuan);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Task[]) ?? [];
}

export async function insertTask(taskData: {
  judul: string;
  deskripsi?: string;
  assigned_to: string;
  assigned_by?: string;
  deadline?: string;
  prioritas: 1 | 2 | 3;
  satuan?: string;
}): Promise<void> {
  const { error } = await supabase.from('tasks').insert({ ...taskData, status: 'pending' });
  if (error) throw error;
}

export async function patchTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
  if (error) throw error;
}

export async function insertTaskReport(report: {
  task_id: string;
  user_id?: string;
  isi_laporan: string;
  file_url?: string;
}): Promise<void> {
  const { error } = await supabase.from('task_reports').insert(report);
  if (error) throw error;
}

export async function fetchLatestTaskReport(taskId: string): Promise<TaskReport | null> {
  const { data } = await supabase
    .from('task_reports')
    .select('*')
    .eq('task_id', taskId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();
  return (data as TaskReport | null) ?? null;
}
