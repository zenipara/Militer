import { supabase } from '../supabase';

export type SearchResultType = 'task' | 'user' | 'announcement';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  role: string;
}

interface SearchAllParams {
  query: string;
  callerRole: string;
}

interface TaskRow {
  id: string;
  judul: string;
  status: string;
  satuan: string | null;
}

interface UserRow {
  id: string;
  nama: string;
  nrp: string;
  pangkat: string | null;
  role: string;
}

interface AnnouncementRow {
  id: string;
  judul: string;
  isi: string;
}

export async function searchAll(params: SearchAllParams): Promise<SearchResult[]> {
  const { query, callerRole } = params;
  const likeQ = `%${query}%`;
  const canSearchUsers = callerRole === 'admin' || callerRole === 'komandan';

  const [tasksRes, usersRes, announcementsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, judul, status, satuan')
      .or(`judul.ilike.${likeQ},deskripsi.ilike.${likeQ}`)
      .limit(5),
    canSearchUsers
      ? supabase
          .from('users')
          .select('id, nama, nrp, pangkat, role')
          .or(`nama.ilike.${likeQ},nrp.ilike.${likeQ}`)
          .eq('is_active', true)
          .limit(5)
      : Promise.resolve({ data: [] as UserRow[], error: null }),
    supabase
      .from('announcements')
      .select('id, judul, isi')
      .or(`judul.ilike.${likeQ},isi.ilike.${likeQ}`)
      .limit(4),
  ]);

  const tasks = ((tasksRes.data ?? []) as TaskRow[]).map<SearchResult>((t) => ({
    id: t.id,
    type: 'task',
    title: t.judul,
    subtitle: `Status: ${t.status}${t.satuan ? ` · ${t.satuan}` : ''}`,
    role: callerRole,
  }));

  const users = ((usersRes.data ?? []) as UserRow[]).map<SearchResult>((u) => ({
    id: u.id,
    type: 'user',
    title: u.nama,
    subtitle: `${u.nrp}${u.pangkat ? ` · ${u.pangkat}` : ''} · ${u.role}`,
    role: callerRole,
  }));

  const announcements = ((announcementsRes.data ?? []) as AnnouncementRow[]).map<SearchResult>((a) => ({
    id: a.id,
    type: 'announcement',
    title: a.judul,
    subtitle: a.isi.slice(0, 80),
    role: callerRole,
  }));

  return [...tasks, ...users, ...announcements];
}
