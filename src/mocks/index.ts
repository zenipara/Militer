/**
 * Mock data untuk pengembangan offline dan pengujian unit.
 *
 * Semua data di sini adalah FIKSI dan tidak merepresentasikan
 * individu atau instansi nyata.
 *
 * Penggunaan di test:
 *   import { mockUsers, mockTasks } from '@/mocks';
 *   vi.mock('@/lib/api/users', () => ({ fetchUsers: async () => mockUsers }));
 */
import type { User, Task, Attendance, Message, LeaveRequest, Announcement, AuditLog } from '../types';
import type { GatePass } from '../types';

// ============================================================
// Users
// ============================================================

export const mockUsers: User[] = [
  {
    id: 'user-admin-1',
    nrp: '1000001',
    nama: 'Kolonel Budi Santoso',
    role: 'admin',
    pangkat: 'Kolonel',
    jabatan: 'Kepala Kesatuan',
    satuan: 'Batalyon A',
    foto_url: undefined,
    is_active: true,
    is_online: true,
    login_attempts: 0,
    last_login: '2026-04-15T08:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-04-15T08:00:00Z',
  },
  {
    id: 'user-komandan-1',
    nrp: '1000002',
    nama: 'Mayor Ahmad Fauzi',
    role: 'komandan',
    pangkat: 'Mayor',
    jabatan: 'Komandan Kompi',
    satuan: 'Batalyon A',
    foto_url: undefined,
    is_active: true,
    is_online: true,
    login_attempts: 0,
    last_login: '2026-04-15T07:30:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-04-15T07:30:00Z',
  },
  {
    id: 'user-prajurit-1',
    nrp: '1000003',
    nama: 'Sersan Deni Pratama',
    role: 'prajurit',
    pangkat: 'Sersan Dua',
    jabatan: 'Anggota',
    satuan: 'Batalyon A',
    foto_url: undefined,
    is_active: true,
    is_online: false,
    login_attempts: 0,
    last_login: '2026-04-14T18:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-04-14T18:00:00Z',
  },
  {
    id: 'user-prajurit-2',
    nrp: '1000004',
    nama: 'Kopral Rina Wulandari',
    role: 'prajurit',
    pangkat: 'Kopral',
    jabatan: 'Anggota',
    satuan: 'Batalyon A',
    foto_url: undefined,
    is_active: true,
    is_online: false,
    login_attempts: 0,
    last_login: '2026-04-15T06:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-04-15T06:00:00Z',
  },
  {
    id: 'user-guard-1',
    nrp: '1000005',
    nama: 'Prajurit Hendra Wijaya',
    role: 'guard',
    pangkat: 'Prajurit Satu',
    jabatan: 'Petugas Jaga',
    satuan: 'Batalyon A',
    foto_url: undefined,
    is_active: true,
    is_online: true,
    login_attempts: 0,
    last_login: '2026-04-15T06:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-04-15T06:00:00Z',
  },
];

export const mockAdminUser = mockUsers[0];
export const mockKomandanUser = mockUsers[1];
export const mockPrajuritUser = mockUsers[2];
export const mockGuardUser = mockUsers[4];

// ============================================================
// Tasks
// ============================================================

export const mockTasks: Task[] = [
  {
    id: 'task-1',
    judul: 'Inspeksi Perlengkapan Kompi',
    deskripsi: 'Lakukan pemeriksaan dan inventarisasi seluruh perlengkapan kompi sebelum akhir bulan.',
    assigned_to: 'user-prajurit-1',
    assigned_by: 'user-komandan-1',
    status: 'in_progress',
    prioritas: 1,
    deadline: '2026-04-20',
    satuan: 'Batalyon A',
    created_at: '2026-04-10T08:00:00Z',
    updated_at: '2026-04-12T10:00:00Z',
    assignee: mockUsers[2],
    assigner: mockUsers[1],
  },
  {
    id: 'task-2',
    judul: 'Laporan Mingguan Absensi',
    deskripsi: 'Kompilasi data absensi minggu ini dan kirimkan ke komandan.',
    assigned_to: 'user-prajurit-2',
    assigned_by: 'user-komandan-1',
    status: 'done',
    prioritas: 2,
    deadline: '2026-04-15',
    satuan: 'Batalyon A',
    created_at: '2026-04-08T08:00:00Z',
    updated_at: '2026-04-14T15:00:00Z',
    assignee: mockUsers[3],
    assigner: mockUsers[1],
  },
  {
    id: 'task-3',
    judul: 'Latihan Fisik Mingguan',
    deskripsi: 'Pimpin latihan fisik anggota kompi pada hari Kamis pagi.',
    assigned_to: 'user-prajurit-1',
    assigned_by: 'user-komandan-1',
    status: 'pending',
    prioritas: 2,
    deadline: '2026-04-17',
    satuan: 'Batalyon A',
    created_at: '2026-04-13T08:00:00Z',
    updated_at: '2026-04-13T08:00:00Z',
    assignee: mockUsers[2],
    assigner: mockUsers[1],
  },
  {
    id: 'task-4',
    judul: 'Pengamanan Upacara Hari Kartini',
    deskripsi: 'Siapkan personel untuk pengamanan upacara hari Kartini.',
    assigned_to: 'user-prajurit-2',
    assigned_by: 'user-komandan-1',
    status: 'approved',
    prioritas: 1,
    deadline: '2026-04-21',
    satuan: 'Batalyon A',
    created_at: '2026-04-14T08:00:00Z',
    updated_at: '2026-04-15T09:00:00Z',
    assignee: mockUsers[3],
    assigner: mockUsers[1],
  },
];

// ============================================================
// Attendance
// ============================================================

export const mockAttendances: Attendance[] = [
  {
    id: 'att-1',
    user_id: 'user-prajurit-1',
    tanggal: '2026-04-15',
    check_in: '2026-04-15T06:05:00Z',
    check_out: undefined,
    status: 'hadir',
    created_at: '2026-04-15T06:05:00Z',
    user: mockUsers[2],
  },
  {
    id: 'att-2',
    user_id: 'user-prajurit-1',
    tanggal: '2026-04-14',
    check_in: '2026-04-14T06:10:00Z',
    check_out: '2026-04-14T17:00:00Z',
    status: 'hadir',
    created_at: '2026-04-14T06:10:00Z',
    user: mockUsers[2],
  },
  {
    id: 'att-3',
    user_id: 'user-prajurit-1',
    tanggal: '2026-04-13',
    check_in: undefined,
    check_out: undefined,
    status: 'izin',
    keterangan: 'Izin keluarga',
    created_at: '2026-04-13T07:00:00Z',
    user: mockUsers[2],
  },
];

// ============================================================
// Messages
// ============================================================

export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    from_user: 'user-komandan-1',
    to_user: 'user-prajurit-1',
    isi: 'Sersan Deni, harap hadir di briefing jam 08.00 besok pagi. Terima kasih.',
    is_read: false,
    created_at: '2026-04-15T07:30:00Z',
    sender: mockUsers[1],
    receiver: mockUsers[2],
  },
  {
    id: 'msg-2',
    from_user: 'user-prajurit-1',
    to_user: 'user-komandan-1',
    isi: 'Siap, Pak Mayor. Akan hadir tepat waktu.',
    is_read: true,
    created_at: '2026-04-15T07:45:00Z',
    sender: mockUsers[2],
    receiver: mockUsers[1],
  },
];

// ============================================================
// Gate Pass
// ============================================================

export const mockGatePasses: GatePass[] = [
  {
    id: 'gp-1',
    user_id: 'user-prajurit-1',
    keperluan: 'Urusan keluarga',
    tujuan: 'Rumah (Bekasi)',
    waktu_keluar: '2026-04-16T08:00:00Z',
    waktu_kembali: '2026-04-16T17:00:00Z',
    status: 'approved',
    approved_by: 'user-komandan-1',
    qr_token: 'MOCK-QR-TOKEN-001',
    created_at: '2026-04-15T10:00:00Z',
  },
  {
    id: 'gp-2',
    user_id: 'user-prajurit-2',
    keperluan: 'Keperluan medis',
    tujuan: 'RSAD Jakarta',
    waktu_keluar: '2026-04-15T09:00:00Z',
    waktu_kembali: '2026-04-15T14:00:00Z',
    status: 'pending',
    qr_token: 'MOCK-QR-TOKEN-002',
    created_at: '2026-04-15T08:30:00Z',
  },
];

// ============================================================
// Leave Requests
// ============================================================

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'lr-1',
    user_id: 'user-prajurit-1',
    jenis_izin: 'cuti',
    tanggal_mulai: '2026-04-22',
    tanggal_selesai: '2026-04-25',
    alasan: 'Cuti tahunan untuk pernikahan saudara.',
    status: 'pending',
    created_at: '2026-04-15T09:00:00Z',
    user: mockUsers[2],
  },
];

// ============================================================
// Announcements
// ============================================================

export const mockAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    judul: 'Upacara Hari Kartini 21 April 2026',
    isi: 'Seluruh personel wajib hadir dalam upacara Hari Kartini pada tanggal 21 April 2026 pukul 07.30 WIB. Pakaian dinas upacara lengkap.',
    is_pinned: true,
    created_by: 'user-admin-1',
    target_role: ['admin', 'komandan', 'prajurit', 'guard'],
    created_at: '2026-04-10T08:00:00Z',
    creator: mockUsers[0],
  },
  {
    id: 'ann-2',
    judul: 'Jadwal Latihan Fisik Bulan April',
    isi: 'Latihan fisik dilaksanakan setiap Selasa dan Kamis pukul 06.00 WIB di lapangan utama.',
    is_pinned: false,
    created_by: 'user-komandan-1',
    target_role: ['prajurit'],
    created_at: '2026-04-05T08:00:00Z',
    creator: mockUsers[1],
  },
];

// ============================================================
// Audit Logs
// ============================================================

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    user_id: 'user-admin-1',
    action: 'CREATE_USER',
    resource: 'users',
    resource_id: 'user-prajurit-2',
    detail: { nama: 'Kopral Rina Wulandari' },
    created_at: '2026-04-01T09:00:00Z',
    user: mockUsers[0],
  },
  {
    id: 'log-2',
    user_id: 'user-komandan-1',
    action: 'APPROVE_GATE_PASS',
    resource: 'gate_pass',
    resource_id: 'gp-1',
    detail: { status: 'approved' },
    created_at: '2026-04-15T10:30:00Z',
    user: mockUsers[1],
  },
];
