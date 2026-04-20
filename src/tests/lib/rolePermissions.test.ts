import { describe, expect, it } from 'vitest';
import {
  ROLE_OPTIONS,
  getRoleAccessDescription,
  getRoleCode,
  getRoleDefaultPath,
  getRoleDisplayLabel,
  getRoleFallbackPaths,
  isRoleAdmin,
  isRoleGuard,
  isRoleKomandan,
  isRolePrajurit,
  isRoleStaf,
  isKnownRole,
  normalizeRole,
} from '../../lib/rolePermissions';

describe('rolePermissions helpers', () => {
  it('normalizes role codes to canonical role', () => {
    expect(normalizeRole('SAD')).toBe('admin');
    expect(normalizeRole('KMD')).toBe('komandan');
    expect(normalizeRole('STF')).toBe('staf');
    expect(normalizeRole('PRJ')).toBe('prajurit');
    expect(normalizeRole('PJP')).toBe('guard');
  });

  it('keeps canonical roles as-is', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('komandan')).toBe('komandan');
    expect(normalizeRole('staf')).toBe('staf');
    expect(normalizeRole('prajurit')).toBe('prajurit');
    expect(normalizeRole('guard')).toBe('guard');
  });

  it('recognizes known roles from canonical and code forms', () => {
    expect(isKnownRole('admin')).toBe(true);
    expect(isKnownRole('SAD')).toBe(true);
    expect(isKnownRole('PJP')).toBe(true);
    expect(isKnownRole('unknown')).toBe(false);
  });

  it('returns correct display label and role code', () => {
    expect(getRoleDisplayLabel('admin')).toBe('Super Admin');
    expect(getRoleDisplayLabel('SAD')).toBe('Super Admin');
    expect(getRoleDisplayLabel('guard')).toBe('Petugas Jaga / Provost');
    expect(getRoleCode('komandan')).toBe('KMD');
    expect(getRoleCode('KMD')).toBe('KMD');
  });

  it('returns access description and default path for both code and canonical role', () => {
    expect(getRoleAccessDescription('STF')).toBe('Input operasional sesuai bidang (S-1/S-3/S-4)');
    expect(getRoleDefaultPath('PRJ')).toBe('/prajurit/dashboard');
    expect(getRoleDefaultPath('admin')).toBe('/admin/dashboard');
    expect(getRoleDefaultPath('unknown')).toBeNull();
  });

  it('returns fallback paths and role options with code labels', () => {
    expect(getRoleFallbackPaths('SAD')).toContain('/admin/settings');
    expect(getRoleFallbackPaths('PJP')).toContain('/guard/discipline');
    const adminOption = ROLE_OPTIONS.find((opt) => opt.value === 'admin');
    expect(adminOption?.label).toBe('Super Admin (SAD)');
    expect(adminOption?.description).toBe('Super Admin: konfigurasi sistem & audit');
  });

  it('supports semantic role predicates for code and canonical values', () => {
    expect(isRoleAdmin('admin')).toBe(true);
    expect(isRoleAdmin('SAD')).toBe(true);
    expect(isRoleKomandan('KMD')).toBe(true);
    expect(isRoleStaf('STF')).toBe(true);
    expect(isRolePrajurit('PRJ')).toBe(true);
    expect(isRoleGuard('PJP')).toBe(true);
    expect(isRoleGuard('staf')).toBe(false);
  });
});
