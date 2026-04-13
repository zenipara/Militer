// ============================================================
// Core Types
// ============================================================

export type Role = 'admin' | 'komandan' | 'prajurit';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'approved' | 'rejected';
export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa' | 'dinas_luar';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

// ============================================================
// User
// ============================================================

export interface User {
  id: string;
  nrp: string;
  nama: string;
  role: Role;
  pangkat?: string;
  jabatan?: string;
  satuan: string;
  foto_url?: string;
  is_active: boolean;
  is_online: boolean;
  login_attempts: number;
  locked_until?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Task
// ============================================================

export interface Task {
  id: string;
  judul: string;
  deskripsi?: string;
  assigned_to?: string;
  assigned_by?: string;
  status: TaskStatus;
  prioritas: 1 | 2 | 3;
  deadline?: string;
  satuan?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee?: User;
  assigner?: User;
}

export interface TaskReport {
  id: string;
  task_id: string;
  user_id: string;
  isi_laporan: string;
  file_url?: string;
  submitted_at: string;
  task?: Task;
  user?: User;
}

// ============================================================
// Attendance
// ============================================================

export interface Attendance {
  id: string;
  user_id: string;
  tanggal: string;
  check_in?: string;
  check_out?: string;
  status: AttendanceStatus;
  keterangan?: string;
  created_at: string;
  user?: User;
}

// ============================================================
// Leave Request
// ============================================================

export interface LeaveRequest {
  id: string;
  user_id: string;
  jenis_izin: 'cuti' | 'sakit' | 'dinas_luar';
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  status: LeaveStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  user?: User;
  reviewer?: User;
}

// ============================================================
// Announcement
// ============================================================

export interface Announcement {
  id: string;
  judul: string;
  isi: string;
  target_role?: Role[];
  target_satuan?: string;
  created_by?: string;
  is_pinned: boolean;
  created_at: string;
  creator?: User;
}

// ============================================================
// Message
// ============================================================

export interface Message {
  id: string;
  from_user?: string;
  to_user?: string;
  isi: string;
  is_read: boolean;
  created_at: string;
  sender?: User;
  receiver?: User;
}

// ============================================================
// Logistics
// ============================================================

export interface LogisticsItem {
  id: string;
  nama_item: string;
  kategori?: string;
  jumlah: number;
  satuan_item?: string;
  kondisi?: 'baik' | 'rusak_ringan' | 'rusak_berat';
  lokasi?: string;
  catatan?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Audit Log
// ============================================================

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  detail?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: User;
}

// ============================================================
// Shift Schedule
// ============================================================

export interface ShiftSchedule {
  id: string;
  user_id: string;
  tanggal: string;
  shift_mulai: string;
  shift_selesai: string;
  jenis_shift?: 'pagi' | 'siang' | 'malam' | 'jaga';
  created_by?: string;
  created_at: string;
  user?: User;
}

// ============================================================
// Document
// ============================================================

export interface Document {
  id: string;
  nama: string;
  kategori?: string;
  file_url: string;
  file_size?: number;
  satuan?: string;
  uploaded_by?: string;
  created_at: string;
  uploader?: User;
}

// ============================================================
// Discipline Note
// ============================================================

export interface DisciplineNote {
  id: string;
  user_id: string;
  jenis?: 'peringatan' | 'penghargaan' | 'catatan';
  isi: string;
  created_by?: string;
  created_at: string;
  user?: User;
  creator?: User;
}

// ============================================================
// Auth Session
// ============================================================

export interface KaryoSession {
  user_id: string;
  role: Role;
  expires_at: string;
}
