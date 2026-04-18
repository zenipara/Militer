// ============================================================
// Core Types
// ============================================================

// ============================================================
// Gate Pass
// ============================================================

export type GatePassStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'checked_in'
  | 'completed'
  | 'out'
  | 'returned'
  | 'overdue';

export interface GatePass {
  id: string;
  user_id: string;
  keperluan: string;
  tujuan: string;
  waktu_keluar: string;
  waktu_kembali: string;
  actual_keluar?: string;
  actual_kembali?: string;
  status: GatePassStatus;
  approved_by?: string;
  qr_token: string;
  created_at: string;
  // Joined field (populated when fetched with user join)
  user?: User;
}

export type Role = 'admin' | 'komandan' | 'prajurit' | 'guard';

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
  // Extended profile fields
  tempat_lahir?: string;
  tanggal_lahir?: string;
  no_telepon?: string;
  alamat?: string;
  tanggal_masuk_dinas?: string;
  pendidikan_terakhir?: string;
  agama?: string;
  status_pernikahan?: 'lajang' | 'menikah' | 'cerai' | 'duda' | 'janda';
  golongan_darah?: 'A' | 'B' | 'AB' | 'O';
  // Admin-only fields
  nomor_ktp?: string;
  catatan_khusus?: string;
  // Emergency contact
  kontak_darurat_nama?: string;
  kontak_darurat_telp?: string;
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
// Pos Jaga (Static QR Guard Post)
// ============================================================

export interface PosJaga {
  id: string;
  nama: string;
  qr_token: string;
  is_active: boolean;
  created_at: string;
}

/** Result returned by the `scan_pos_jaga` RPC */
export interface ScanPosJagaResult {
  gate_pass_id: string;
  pos_nama: string;
  status: GatePassStatus;
  message: string;
}

// ============================================================
// Auth Session
// ============================================================

export interface KaryoSession {
  user_id: string;
  role: Role;
  expires_at: string;
}

// ============================================================
// Logistics Request
// ============================================================

export type LogisticsRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LogisticsRequest {
  id: string;
  requested_by: string;
  satuan: string;
  nama_item: string;
  jumlah: number;
  satuan_item?: string;
  alasan: string;
  status: LogisticsRequestStatus;
  admin_note?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  requester?: User;
  reviewer?: User;
}
