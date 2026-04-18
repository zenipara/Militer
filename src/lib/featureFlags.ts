export type FeatureKey =
  | 'user_management'
  | 'logistics'
  | 'documents'
  | 'announcements'
  | 'shift_schedule'
  | 'attendance'
  | 'gate_pass'
  | 'pos_jaga'
  | 'audit_log'
  | 'tasks'
  | 'messages'
  | 'leave_requests'
  | 'reports';

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  paths: string[];
}

export type FeatureFlagsState = Record<FeatureKey, boolean>;

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: 'user_management',
    label: 'Manajemen Personel',
    description: 'Kelola data anggota, aktivasi akun, reset PIN, dan perubahan profil personel.',
    paths: ['/admin/users', '/komandan/personnel'],
  },
  {
    key: 'logistics',
    label: 'Logistik',
    description: 'Kelola inventaris logistik serta permintaan logistik dari lapangan.',
    paths: ['/admin/logistics', '/komandan/logistics-request'],
  },
  {
    key: 'documents',
    label: 'Dokumen',
    description: 'Akses arsip dokumen operasional dan unduhan berkas satuan.',
    paths: ['/admin/documents'],
  },
  {
    key: 'announcements',
    label: 'Pengumuman',
    description: 'Broadcast informasi, pin pengumuman, dan update informasi resmi.',
    paths: ['/admin/announcements'],
  },
  {
    key: 'shift_schedule',
    label: 'Jadwal Shift',
    description: 'Pengaturan jadwal piket dan shift personel.',
    paths: ['/admin/schedule'],
  },
  {
    key: 'attendance',
    label: 'Absensi',
    description: 'Rekap dan pencatatan kehadiran lintas peran.',
    paths: ['/admin/attendance', '/komandan/attendance', '/prajurit/attendance'],
  },
  {
    key: 'gate_pass',
    label: 'Gate Pass',
    description: 'Pengajuan, approval, monitoring, dan pemindaian Gate Pass.',
    paths: ['/admin/gatepass-monitor', '/komandan/gatepass-approval', '/komandan/gatepass-monitor', '/prajurit/gatepass', '/guard/gatepass-scan'],
  },
  {
    key: 'pos_jaga',
    label: 'Pos Jaga',
    description: 'Kelola Pos Jaga dan alur scan QR Pos Jaga.',
    paths: ['/admin/pos-jaga', '/prajurit/scan-pos'],
  },
  {
    key: 'audit_log',
    label: 'Audit Log',
    description: 'Riwayat aktivitas sistem untuk monitoring dan audit internal.',
    paths: ['/admin/audit'],
  },
  {
    key: 'tasks',
    label: 'Tugas',
    description: 'Manajemen dan pelacakan tugas personel.',
    paths: ['/komandan/tasks', '/prajurit/tasks'],
  },
  {
    key: 'messages',
    label: 'Pesan',
    description: 'Fitur pesan internal antar personel.',
    paths: ['/prajurit/messages', '/komandan/messages'],
  },
  {
    key: 'leave_requests',
    label: 'Permohonan Izin',
    description: 'Pengajuan dan pemantauan izin/cuti personel.',
    paths: ['/prajurit/leave'],
  },
  {
    key: 'reports',
    label: 'Laporan & Evaluasi',
    description: 'Halaman laporan dan evaluasi untuk peran komandan.',
    paths: ['/komandan/reports', '/komandan/evaluation'],
  },
];

export const DEFAULT_FEATURE_FLAGS: FeatureFlagsState = FEATURE_DEFINITIONS.reduce((acc, item) => {
  acc[item.key] = true;
  return acc;
}, {} as FeatureFlagsState);

export function getFeatureKeyByPath(pathname: string): FeatureKey | null {
  for (const feature of FEATURE_DEFINITIONS) {
    const matched = feature.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (matched) return feature.key;
  }
  return null;
}

export function isPathEnabled(pathname: string, flags: FeatureFlagsState): boolean {
  const key = getFeatureKeyByPath(pathname);
  if (!key) return true;
  return flags[key] !== false;
}