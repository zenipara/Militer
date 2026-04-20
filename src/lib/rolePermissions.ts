/**
 * RBAC utilities for role hierarchy and access control.
 *
 * Implements the access rules from SPESIFIKASI.md §3.3:
 * - Komandan bertingkat (BATALION/KOMPI/PELETON)
 * - Staf berbasis bidang (S-1 Pers / S-3 Ops / S-4 Log)
 * - Guard/Provost — baca discipline_notes
 * - Admin — konfigurasi sistem, bukan operasional harian
 */

import type { User, CommandLevel } from '../types';

// ── Staf bidang ──────────────────────────────────────────────────────────────

export type StafBidang = 's1' | 's3' | 's4' | 'umum';

/**
 * Detect the operational field (bidang) of a staf user based on their `jabatan`.
 * Mirrors the logic from StafDashboard.detectBidang and the RLS policies.
 */
export function getBidangFromJabatan(jabatan?: string): StafBidang {
  if (!jabatan) return 'umum';
  const j = jabatan.toLowerCase();
  if (j.includes('s-1') || j.includes('s1') || j.includes('pers')) return 's1';
  if (j.includes('s-4') || j.includes('s4') || j.includes('log')) return 's4';
  if (j.includes('s-3') || j.includes('s3') || j.includes('ops')) return 's3';
  return 'umum';
}

export type WriteModule =
  | 'attendance'   // S-1 Pers
  | 'leave'        // S-1 Pers
  | 'tasks'        // S-3 Ops
  | 'shifts'       // S-3 Ops
  | 'logistics';   // S-4 Log

const BIDANG_WRITE_MAP: Record<StafBidang, WriteModule[]> = {
  s1:   ['attendance', 'leave'],
  s3:   ['tasks', 'shifts'],
  s4:   ['logistics'],
  umum: [],
};

/**
 * Returns true when `user` is allowed to perform write operations on `module`.
 *
 * - Admin → always allowed (for their own admin pages)
 * - Komandan → allowed on operational modules they command
 * - Staf → allowed only for their bidang
 * - Others (prajurit, guard) → not allowed
 */
export function canWrite(user: User | null, module: WriteModule): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'komandan') return true;
  if (user.role === 'staf') {
    const bidang = getBidangFromJabatan(user.jabatan);
    return BIDANG_WRITE_MAP[bidang].includes(module);
  }
  return false;
}

/**
 * Returns true when the user has NO write access in the current context.
 * Useful for showing read-only banners.
 */
export function isReadOnlyUser(user: User | null, module: WriteModule): boolean {
  return !canWrite(user, module);
}

// ── Komandan scope ────────────────────────────────────────────────────────────

export type KomandanScope = 'batalion' | 'kompi' | 'peleton' | 'none';

/** Map CommandLevel enum → internal scope enum */
const LEVEL_TO_SCOPE: Record<CommandLevel, KomandanScope> = {
  BATALION: 'batalion',
  KOMPI:    'kompi',
  PELETON:  'peleton',
};

export function getKomandanScope(user: User | null): KomandanScope {
  if (!user || user.role !== 'komandan') return 'none';
  if (!user.level_komando) return 'none';
  return LEVEL_TO_SCOPE[user.level_komando] ?? 'none';
}

/** Human-readable scope label */
export function getKomandanScopeLabel(level?: CommandLevel | null): string {
  if (!level) return '—';
  const labels: Record<CommandLevel, string> = {
    BATALION: 'Komandan Batalion',
    KOMPI:    'Komandan Kompi',
    PELETON:  'Komandan Peleton',
  };
  return labels[level];
}

/**
 * Returns the data-scope description for a given level:
 * - BATALION → lihat semua data batalion
 * - KOMPI    → lihat data kompi dan peleton di bawah kompinya
 * - PELETON  → lihat data peleton sendiri
 */
export function getKomandanScopeDescription(level?: CommandLevel | null): string {
  if (!level) return 'Akses data tidak terkonfigurasi.';
  const desc: Record<CommandLevel, string> = {
    BATALION: 'Akses penuh seluruh data satuan batalion.',
    KOMPI:    'Akses data kompi dan peleton di bawah kompinya.',
    PELETON:  'Akses terbatas pada data peleton sendiri.',
  };
  return desc[level];
}

// ── Operational label ─────────────────────────────────────────────────────────

/** Role + bidang/level → display label sesuai SPESIFIKASI §3.3 */
export function getOperationalRoleLabel(user: User | null): string {
  if (!user) return '—';
  switch (user.role) {
    case 'admin':    return 'Super Admin';
    case 'prajurit': return 'Prajurit';
    case 'guard':    return 'Petugas Jaga / Provost';
    case 'komandan': return getKomandanScopeLabel(user.level_komando);
    case 'staf': {
      const b = getBidangFromJabatan(user.jabatan);
      const labels: Record<StafBidang, string> = {
        s1:   'Staf Bidang S-1 Personel',
        s3:   'Staf Bidang S-3 Operasional',
        s4:   'Staf Bidang S-4 Logistik',
        umum: 'Staf Operasional',
      };
      return labels[b];
    }
    default: return user.role;
  }
}

// ── Guard access ──────────────────────────────────────────────────────────────

/** True if the user is a Guard/Provost and can read discipline notes. */
export function canReadDisciplineNotes(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'guard' || user.role === 'komandan' || user.role === 'admin';
}
