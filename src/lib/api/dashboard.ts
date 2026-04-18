import { supabase } from '../supabase';
import type { AuditLog, Attendance, LogisticsItem } from '../../types';

export interface DashboardStats {
  totalPersonel: number;
  totalOnline: number;
  totalTugas: number;
  tugasAktif: number;
  pendingIzin: number;
  absensiHariIni: number;
  absensiMasuk: number;
  pinnedPengumuman: number;
}

export interface GatePassStats {
  checkedIn: number;
  completed: number;
  overdue: number;
}

export interface AdminDashboardSnapshot {
  stats: DashboardStats;
  recentLogs: AuditLog[];
  lowStockItems: LogisticsItem[];
  heatmapAttendances: Attendance[];
  gatePassStats: GatePassStats;
  fetchedAt: string;
}

function ensureNoError(context: string, error: { message: string } | null): void {
  if (error) {
    throw new Error(`Gagal memuat ${context}: ${error.message}`);
  }
}

export async function fetchAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [
    usersResult,
    tasksResult,
    onlineResult,
    activeTasksResult,
    pendingLeaveResult,
    attendanceTotalResult,
    attendancePresentResult,
    pinnedAnnouncementsResult,
    logisticsResult,
    logsResult,
    heatmapResult,
    gatePassResult,
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('tasks').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_online', true),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
    supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('tanggal', today),
    supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('tanggal', today).eq('status', 'hadir'),
    supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
    supabase.from('logistics_items').select('id, nama_item, jumlah, kondisi, kategori, lokasi, satuan_item').order('jumlah', { ascending: true }),
    supabase
      .from('audit_logs')
      .select('*, user:user_id(id,nama,nrp,role)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('attendance')
      .select('*, user:user_id(id,nama,nrp,pangkat)')
      .gte('tanggal', thirtyDaysAgoStr)
      .lte('tanggal', today)
      .order('tanggal', { ascending: false }),
    supabase.from('gate_pass').select('status, waktu_kembali'),
  ]);

  ensureNoError('total personel', usersResult.error);
  ensureNoError('total tugas', tasksResult.error);
  ensureNoError('personel online', onlineResult.error);
  ensureNoError('tugas aktif', activeTasksResult.error);
  ensureNoError('izin pending', pendingLeaveResult.error);
  ensureNoError('absensi hari ini', attendanceTotalResult.error);
  ensureNoError('absensi masuk', attendancePresentResult.error);
  ensureNoError('pengumuman pin', pinnedAnnouncementsResult.error);
  ensureNoError('stok logistik', logisticsResult.error);
  ensureNoError('audit log terbaru', logsResult.error);
  ensureNoError('heatmap absensi', heatmapResult.error);
  ensureNoError('statistik gate pass', gatePassResult.error);

  const logisticsItems = (logisticsResult.data as LogisticsItem[]) ?? [];
  const lowStockItems = logisticsItems.filter((item) => item.jumlah <= 5 || item.kondisi !== 'baik');

  interface GatePassRow {
    status?: string;
    waktu_kembali?: string | null;
  }

  const gatePassRows = (gatePassResult.data as GatePassRow[]) ?? [];
  const now = new Date();
  const checkedInRows = gatePassRows.filter((g) => g.status === 'checked_in' || g.status === 'out');
  const completedRows = gatePassRows.filter((g) => g.status === 'completed' || g.status === 'returned');
  const gatePassStats: GatePassStats = {
    checkedIn: checkedInRows.filter((g) => !g.waktu_kembali || new Date(g.waktu_kembali) >= now).length,
    completed: completedRows.length,
    overdue: checkedInRows.filter((g) => g.waktu_kembali && new Date(g.waktu_kembali) < now).length,
  };

  return {
    stats: {
      totalPersonel: usersResult.count ?? 0,
      totalOnline: onlineResult.count ?? 0,
      totalTugas: tasksResult.count ?? 0,
      tugasAktif: activeTasksResult.count ?? 0,
      pendingIzin: pendingLeaveResult.count ?? 0,
      absensiHariIni: attendanceTotalResult.count ?? 0,
      absensiMasuk: attendancePresentResult.count ?? 0,
      pinnedPengumuman: pinnedAnnouncementsResult.count ?? 0,
    },
    recentLogs: (logsResult.data as AuditLog[]) ?? [],
    lowStockItems,
    heatmapAttendances: (heatmapResult.data as Attendance[]) ?? [],
    gatePassStats,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchKomandanDashboardStats(
  satuan: string,
): Promise<{ onlineCount: number; totalPersonel: number }> {
  const [onlineRes, totalRes] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_online', true).eq('satuan', satuan),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('satuan', satuan).eq('is_active', true),
  ]);

  ensureNoError('personel online', onlineRes.error);
  ensureNoError('total personel aktif', totalRes.error);

  return {
    onlineCount: onlineRes.count ?? 0,
    totalPersonel: totalRes.count ?? 0,
  };
}
