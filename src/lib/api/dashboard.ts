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
  personilTersedia: number;
  personilDiLuar: number;
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

  // Optimization: Batch queries into logical groups
  // Group 1: Count-only queries
  const [
    tasksResult,
    pendingLeaveResult,
    pinnedAnnouncementsResult,
  ] = await Promise.all([
    supabase.from('tasks').select('id', { count: 'exact', head: true }),
    supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
  ]);

  // Group 2: Users-related queries (optimize: fetch once, filter twice)
  const usersCountResult = await supabase.from('users').select('id, is_online', { count: 'exact', head: false }).eq('is_active', true);
  ensureNoError('total personel', usersCountResult.error);
  const totalPersonel = usersCountResult.count ?? 0;
  const totalOnline = usersCountResult.data?.filter(u => u.is_online).length ?? 0;

  // Group 3: Attendance & Tasks combined with data
  const [
    attendanceResult,
    logsResult,
    heatmapResult,
    logisticsResult,
    gatePassResult,
  ] = await Promise.all([
    supabase.from('attendance').select('id, tanggal, status').eq('tanggal', today),
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
    supabase.from('logistics_items').select('id, nama_item, jumlah, kondisi, kategori, lokasi, satuan_item').order('jumlah', { ascending: true }),
    supabase.from('gate_pass').select('status, waktu_kembali'),
  ]);

  ensureNoError('total tugas', tasksResult.error);
  ensureNoError('tugas aktif', null); // Will compute from tasksResult
  ensureNoError('izin pending', pendingLeaveResult.error);
  ensureNoError('absensi hari ini', attendanceResult.error);
  ensureNoError('pengumuman pin', pinnedAnnouncementsResult.error);
  ensureNoError('audit log terbaru', logsResult.error);
  ensureNoError('heatmap absensi', heatmapResult.error);
  ensureNoError('stok logistik', logisticsResult.error);
  ensureNoError('statistik gate pass', gatePassResult.error);

  // Compute stats from fetched data (client-side optimization)
  const attendanceData = (attendanceResult.data as unknown as Array<{ tanggal: string; status: string }>) ?? [];
  const absensiHariIni = attendanceData.length;
  const absensiMasuk = attendanceData.filter(a => a.status === 'hadir').length;

  const tasksData = (tasksResult.data as unknown as Array<{ status: string }>) ?? [];
  const activeTasksCount = tasksData.filter(t => ['pending', 'in_progress'].includes(t.status)).length;

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
  
  // Personil di luar = yang sedang keluar (approved + checked_in)
  const personilDiLuar = gatePassRows.filter((g) => 
    g.status === 'approved' || g.status === 'checked_in' || g.status === 'out'
  ).length;
  
  // Personil tersedia = total personel - personil di luar (dengan minimum 0)
  const personilTersedia = Math.max(0, totalPersonel - personilDiLuar);
  
  const gatePassStats: GatePassStats = {
    checkedIn: checkedInRows.filter((g) => !g.waktu_kembali || new Date(g.waktu_kembali) >= now).length,
    completed: completedRows.length,
    overdue: checkedInRows.filter((g) => g.waktu_kembali && new Date(g.waktu_kembali) < now).length,
    personilTersedia,
    personilDiLuar,
  };

  return {
    stats: {
      totalPersonel,
      totalOnline,
      totalTugas: tasksResult.count ?? 0,
      tugasAktif: activeTasksCount,
      pendingIzin: pendingLeaveResult.count ?? 0,
      absensiHariIni,
      absensiMasuk,
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
