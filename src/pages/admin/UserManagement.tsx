import { useState, useRef, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/ui/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import SatuanSelector from '../../components/common/SatuanSelector';
import PageHeader from '../../components/ui/PageHeader';
import { RoleBadge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Skeleton';
import Pagination from '../../components/ui/Pagination';
import UserDetailModal from '../../components/common/UserDetailModal';
import UserTableActions from '../../components/admin/UserTableActions';
import BatchOperationModals from '../../components/admin/BatchOperationModals';
import {
  CreateUserModal,
  ResetPinModal,
  BulkResetPinModal,
  RoleEditModal,
  DeleteUserModal,
  UnlockUserModal,
  ImportPersonelModal,
} from '../../components/admin/modals';
import { useUsers } from '../../hooks/useUsers';
import { useSatuans } from '../../hooks/useSatuans';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useDebounce } from '../../hooks/useDebounce';
import { ICONS } from '../../icons';
import { supabase } from '../../lib/supabase';
import { notifyDataChanged } from '../../lib/dataSync';
import { ensureSessionContext } from '../../lib/api/sessionContext';
import { ROLE_OPTIONS, getRoleCode, getRoleDisplayLabel, isRoleAdmin, isRoleKomandan, normalizeRole } from '../../lib/rolePermissions';
import { validateNewUserForm, validatePin, validateRoleEditForm, getFirstErrorMessage } from '../../lib/validation/personelValidation';
import type { User, Role, CommandLevel } from '../../types';

const PAGE_SIZE = 50;
const MAX_IMPORT_ROWS = 5000;
const IMPORT_CHUNK_SIZE = 50;

function normalizeImportedRole(value: string | undefined): Role {
  const normalized = normalizeRole(value ?? '') ?? 'prajurit';
  return (normalized === 'admin' || normalized === 'komandan' || normalized === 'staf' || normalized === 'guard' || normalized === 'prajurit')
    ? normalized
    : 'prajurit';
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  out.push(current.trim());
  return out;
}

/** Parse CSV text into array of objects keyed by header row. */
function parseCSV(text: string): Record<string, string>[] {
  const normalized = text.replace(/^\uFEFF/, '').trim();
  if (!normalized) return [];
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line).map((v) => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

export default function UserManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const setPage = (page: number) => setCurrentPage(Math.max(1, page));

  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 300);
  const [filterRole, setFilterRole] = useState<Role | ''>('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | ''>('');

  const { users, isLoading, error, totalItems, totalPages, createUser, updateUser, toggleUserActive, deleteUser, resetUserPin, getUserById } = useUsers({
    orderBy: 'created_at',
    ascending: false,
    serverPaginated: true,
    page: currentPage,
    pageSize: PAGE_SIZE,
    searchQuery: search,
    role: filterRole || undefined,
    isActive: filterStatus ? filterStatus === 'active' : undefined,
  });
  const { showNotification } = useUIStore();
  const authUser = useAuthStore((s) => s.user);
  const { satuans, isLoading: isSatuansLoading } = useSatuans({ onlyActive: true });

  const [showCreate, setShowCreate] = useState(false);
  const [showResetPin, setShowResetPin] = useState(false);
  const [showBulkReset, setShowBulkReset] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleEdit, setShowRoleEdit] = useState(false);
  const [roleEditUser, setRoleEditUser] = useState<User | null>(null);
  const [roleEditForm, setRoleEditForm] = useState<{ role: Role; level_komando: '' | 'BATALION' | 'KOMPI' | 'PELETON' }>({
    role: 'prajurit',
    level_komando: '',
  });
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Form state
  const [form, setForm] = useState({ nrp: '', nama: '', pin: '', role: 'prajurit' as Role, satuan: '', pangkat: '', level_komando: '' as '' | 'BATALION' | 'KOMPI' | 'PELETON' });
  const [newPin, setNewPin] = useState('');
  const [bulkPin, setBulkPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // CSV import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: { nrp: string; error: string }[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Batch operations state
  const [batchOperation, setBatchOperation] = useState<'delete' | 'toggle-active' | 'role-change' | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const pageStats = useMemo(() => {
    const active = users.filter((u) => u.is_active).length;
    const inactive = users.length - active;
    const online = users.filter((u) => u.is_online).length;
    return {
      pageCount: users.length,
      active,
      inactive,
      online,
    };
  }, [users]);
  const hasFilters = searchRaw.trim().length > 0 || filterRole !== '' || filterStatus !== '';

  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [users, currentPage]);

  const handleCreate = async () => {
    // Validate form data
    const errors = validateNewUserForm({
      nrp: form.nrp,
      nama: form.nama,
      pin: form.pin,
      role: form.role as Role,
      satuan: form.satuan,
      level_komando: form.level_komando || undefined,
    });

    if (errors.length > 0) {
      showNotification(getFirstErrorMessage(errors) || 'Validasi gagal', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const { level_komando: rawLevelKomando, ...formRest } = form;
      const payload: Parameters<typeof createUser>[0] = {
        ...formRest,
        is_active: true,
        level_komando: (rawLevelKomando || undefined) as CommandLevel | undefined,
      };
      await createUser(payload);
      showNotification('Personel berhasil ditambahkan', 'success');
      setPage(1);
      setShowCreate(false);
      setForm({ nrp: '', nama: '', pin: '', role: 'prajurit', satuan: '', pangkat: '', level_komando: '' });
    } catch (err) {
      const message = err instanceof Error
        ? err.message.replace(/menabah/gi, 'menambah')
        : 'Gagal menambah personel';
      showNotification(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPin = async () => {
    if (!selectedUser) return;

    const pinError = validatePin(newPin);
    if (pinError) {
      showNotification(pinError.message, 'error');
      return;
    }

    setIsSaving(true);
    try {
      await resetUserPin(selectedUser.id, newPin);
      showNotification(`PIN ${selectedUser.nama} berhasil direset`, 'success');
      setShowResetPin(false);
      setNewPin('');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal reset PIN', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkResetPin = async () => {
    if (selectedUserIds.size === 0) {
      showNotification('Pilih minimal satu personel', 'error');
      return;
    }

    const pinError = validatePin(bulkPin);
    if (pinError) {
      showNotification(pinError.message, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.rpc('bulk_reset_pins', {
        p_user_ids: Array.from(selectedUserIds),
        p_new_pin: bulkPin,
      });
      if (error) throw error;
      const count = data as number;
      showNotification(`PIN ${count} personel berhasil direset`, 'success');
      setShowBulkReset(false);
      setBulkPin('');
      setSelectedUserIds(new Set());
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal reset PIN massal', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await toggleUserActive(u.id, !u.is_active);
      showNotification(`Akun ${u.nama} ${!u.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } catch {
      showNotification('Gagal mengubah status akun', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (authUser?.id === selectedUser.id) {
      showNotification('Tidak dapat menghapus akun sendiri', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await deleteUser(selectedUser.id);
      showNotification(`Data anggota ${selectedUser.nama} berhasil dihapus`, 'success');
      setShowDelete(false);
      setSelectedUser(null);
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedUser.id);
        return next;
      });
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal menghapus anggota', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          showNotification('CSV tidak berisi data yang bisa diproses', 'error');
          setImportRows([]);
          return;
        }

        const first = rows[0] ?? {};
        const required = ['nrp', 'nama', 'role', 'satuan'];
        const missing = required.filter((key) => !(key in first));
        if (missing.length > 0) {
          showNotification(`Kolom wajib belum lengkap: ${missing.join(', ')}`, 'error');
          setImportRows([]);
          return;
        }

        setImportRows(rows);
        setImportResult(null);
      } catch {
        showNotification('Gagal membaca CSV. Pastikan file valid UTF-8.', 'error');
        setImportRows([]);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImport = async () => {
    if (!isRoleAdmin(authUser?.role)) {
      showNotification('Import CSV hanya untuk Super Admin', 'error');
      return;
    }

    if (importRows.length === 0) {
      showNotification('File CSV kosong atau format tidak valid', 'error');
      return;
    }

    if (importRows.length > MAX_IMPORT_ROWS) {
      showNotification(`Maksimal ${MAX_IMPORT_ROWS} data per import`, 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: Math.ceil(importRows.length / IMPORT_CHUNK_SIZE) });
    try {
      const authUser = useAuthStore.getState().user;
      if (!authUser) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      // Ensure session context is set before RPC call
      await ensureSessionContext(authUser.id, authUser.role);

      const batches = [] as Record<string, string>[][];
      for (let i = 0; i < importRows.length; i += IMPORT_CHUNK_SIZE) {
        batches.push(importRows.slice(i, i + IMPORT_CHUNK_SIZE));
      }

      let totalSuccess = 0;
      let totalFailed = 0;
      const allErrors: { nrp: string; error: string }[] = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        const batch = batches[batchIndex];
        setImportProgress({ current: batchIndex + 1, total: batches.length });
        const payload = batch.map((r) => ({
          nrp: r.nrp ?? '',
          pin: r.pin ?? '123456',
          nama: r.nama ?? '',
          role: normalizeImportedRole(r.role),
          satuan: r.satuan ?? '',
          pangkat: r.pangkat ?? '',
          jabatan: r.jabatan ?? '',
        }));

        try {
          const { data, error } = await supabase.rpc('import_users_csv', { p_users: payload });
          if (error) throw error;

          const result = data as { success: number; failed: number; errors: { nrp: string; error: string }[] };
          totalSuccess += result.success;
          totalFailed += result.failed;
          if (result.errors?.length) {
            allErrors.push(...result.errors);
          }
        } catch (batchError) {
          totalFailed += batch.length;
          const message = batchError instanceof Error ? batchError.message : 'Gagal memproses batch import';
          allErrors.push({
            nrp: batch[0]?.nrp ?? '-',
            error: `Batch ${batchIndex + 1}/${batches.length}: ${message}`,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const aggregated = { success: totalSuccess, failed: totalFailed, errors: allErrors };
      setImportResult(aggregated);

      if (aggregated.success > 0) {
        showNotification(`${aggregated.success} personel berhasil diimpor`, 'success');
        setPage(1);
        notifyDataChanged('users');
      }

      if (aggregated.failed > 0 && aggregated.errors.length > 0) {
        const errorMsgs = aggregated.errors.slice(0, 3).map((e) => `${e.nrp}: ${e.error}`).join('; ');
        showNotification(`Gagal: ${errorMsgs}${aggregated.errors.length > 3 ? '...' : ''}`, 'warning');
      } else if (aggregated.failed > 0) {
        showNotification(`${aggregated.failed} data gagal diimpor`, 'warning');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengimpor data';
      showNotification(message, 'error');
      console.error('CSV Import error:', err);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const openRoleEdit = (user: User) => {
    setRoleEditUser(user);
    setRoleEditForm({
      role: user.role,
      level_komando: user.level_komando ?? '',
    });
    setShowRoleEdit(true);
  };

  const handleRoleUpdate = async () => {
    if (!roleEditUser) return;

    // Validate role edit form
    const errors = validateRoleEditForm({
      role: roleEditForm.role,
      level_komando: roleEditForm.level_komando || undefined,
    });

    if (errors.length > 0) {
      showNotification(getFirstErrorMessage(errors) || 'Validasi gagal', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateUser(roleEditUser.id, {
        role: roleEditForm.role,
        level_komando: isRoleKomandan(roleEditForm.role) ? roleEditForm.level_komando : undefined,
      });
      showNotification(`Role ${roleEditUser.nama} berhasil diubah`, 'success');
      setShowRoleEdit(false);
      setRoleEditUser(null);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal mengubah role', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'nrp,nama,pin,role,satuan,pangkat,jabatan\n3000099,Contoh Prajurit,123456,prajurit,Batalyon 1,Prajurit Dua,Anggota Regu\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_personel.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFilteredCSV = () => {
    if (users.length === 0) {
      showNotification('Tidak ada data untuk diekspor', 'error');
      return;
    }
    const header = 'nrp,nama,pangkat,jabatan,satuan,role,status';
    const rows = users.map((u) =>
      [
        u.nrp,
        `"${u.nama.replace(/"/g, '""')}"`,
        u.pangkat ?? '',
        u.jabatan ?? '',
        `"${u.satuan.replace(/"/g, '""')}"`,
        u.role,
        u.is_active ? 'aktif' : 'nonaktif',
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personel_export_halaman_${currentPage}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`${users.length} personel di halaman ini berhasil diekspor`, 'success');
  };

  const handleUnlockUser = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      await updateUser(selectedUser.id, { login_attempts: 0, locked_until: undefined });
      showNotification(`Akun ${selectedUser.nama} berhasil dibuka`, 'success');
      setShowUnlock(false);
      setSelectedUser(null);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal membuka akun', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Batch operations handlers
  const handleBatchDelete = async () => {
    if (selectedUserIds.size === 0) return;
    
    setIsBatchProcessing(true);
    try {
      const selectedList = users.filter((u) => selectedUserIds.has(u.id));
      
      // Filter out current user (can't delete self)
      const toDelete = selectedList.filter((u) => u.id !== authUser?.id);
      
      if (toDelete.length === 0) {
        showNotification('Tidak ada personel yang bisa dihapus', 'error');
        return;
      }

      let deleted = 0;
      for (const user of toDelete) {
        try {
          await deleteUser(user.id);
          deleted++;
        } catch (e) {
          if (import.meta.env.DEV) console.warn(`Failed to delete ${user.nama}:`, e);
        }
      }

      showNotification(`${deleted} personel berhasil dihapus`, 'success');
      setSelectedUserIds(new Set());
      setBatchOperation(null);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal menghapus personel', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchToggleActive = async (action: 'activate' | 'deactivate' | 'toggle') => {
    if (selectedUserIds.size === 0) return;

    setIsBatchProcessing(true);
    try {
      const selectedList = users.filter((u) => selectedUserIds.has(u.id));
      let updated = 0;

      for (const user of selectedList) {
        let newStatus: boolean;
        if (action === 'toggle') {
          newStatus = !user.is_active;
        } else {
          newStatus = action === 'activate';
        }

        try {
          await updateUser(user.id, { is_active: newStatus });
          updated++;
        } catch (e) {
          if (import.meta.env.DEV) console.warn(`Failed to update ${user.nama}:`, e);
        }
      }

      const actionLabel = action === 'activate' ? 'diaktifkan' : action === 'deactivate' ? 'dinonaktifkan' : 'diubah statusnya';
      showNotification(`${updated} personel berhasil ${actionLabel}`, 'success');
      setSelectedUserIds(new Set());
      setBatchOperation(null);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal mengubah status personel', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchRoleChange = async (role: Role, levelKomando?: CommandLevel) => {
    if (selectedUserIds.size === 0) return;

    setIsBatchProcessing(true);
    try {
      const selectedList = users.filter((u) => selectedUserIds.has(u.id));
      let updated = 0;

      for (const user of selectedList) {
        try {
          await updateUser(user.id, {
            role,
            level_komando: isRoleKomandan(role) ? levelKomando : undefined,
          });
          updated++;
        } catch (e) {
          if (import.meta.env.DEV) console.warn(`Failed to update ${user.nama}:`, e);
        }
      }

      showNotification(`Role ${updated} personel berhasil diubah ke ${role}`, 'success');
      setSelectedUserIds(new Set());
      setBatchOperation(null);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal mengubah role personel', 'error');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  };

  const handleOpenDetail = async (u: User) => {
    // Fetch full detail (including extended fields) before opening modal
    try {
      const full = await getUserById(u.id);
      setDetailUser(full);
    } catch {
      // Fallback to list data if RPC unavailable
      setDetailUser(u);
    }
    setShowDetail(true);
  };

  const handleSaveDetail = async (id: string, updates: Partial<User>) => {
    await updateUser(id, updates);
    // Best-effort detail refresh; the update is already committed.
    try {
      const refreshed = await getUserById(id);
      setDetailUser(refreshed);
    } catch {
      setDetailUser((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
    }
  };

  return (
    <DashboardLayout title="Manajemen Personel">
      <div className="space-y-5 animate-fade-up">
        <PageHeader
          title="Manajemen Personel"
          subtitle="Kelola akun, role, status aktif, reset PIN personel, dan impor data massal."
          breadcrumbs={[
            { label: 'Admin', href: '#/admin' },
            { label: 'Manajemen Personel' },
          ]}
          meta={
            <>
              <span>{totalItems} personel terdaftar</span>
              <span>Halaman {currentPage} dari {totalPages}</span>
              <span>{pageStats.pageCount} data tampil</span>
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Total Terdaftar</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">{totalItems}</p>
            <p className="mt-1 text-xs text-text-muted">Total personel di sistem</p>
          </div>
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Aktif (Halaman)</p>
            <p className="mt-2 text-2xl font-bold text-success">{pageStats.active}</p>
            <p className="mt-1 text-xs text-text-muted">Akun siap digunakan</p>
          </div>
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Nonaktif (Halaman)</p>
            <p className="mt-2 text-2xl font-bold text-accent-red">{pageStats.inactive}</p>
            <p className="mt-1 text-xs text-text-muted">Perlu review status</p>
          </div>
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Online (Realtime)</p>
            <p className="mt-2 text-2xl font-bold text-primary">{pageStats.online}</p>
            <p className="mt-1 text-xs text-text-muted">Terlihat sedang aktif</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-accent-red/30 bg-gradient-to-r from-accent-red/10 to-rose-500/5 p-4 text-sm text-accent-red">
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-accent-red/15">
              <span className="text-base font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        {/* Header actions */}
        <div className="app-card flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </span>
              <input
                type="text"
                placeholder="Cari nama atau NRP..."
                value={searchRaw}
                onChange={(e) => { setSearchRaw(e.target.value); setPage(1); }}
                className="form-control w-full bg-bg-card pl-9"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value as Role | ''); setPage(1); }}
              className="form-control sm:w-40 bg-bg-card"
            >
              <option value="">Semua Role</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as 'active' | 'inactive' | ''); setPage(1); }}
              className="form-control sm:w-40 bg-bg-card"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportFilteredCSV}>
              <span className="flex items-center gap-1.5">
                <ICONS.Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export CSV
              </span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">⬆</span>
                Import CSV
              </span>
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>+ Tambah</Button>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchRaw('');
                  setFilterRole('');
                  setFilterStatus('');
                  setPage(1);
                }}
              >
                Reset Filter
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1 rounded-full border border-surface/60 bg-surface/20 px-2.5 py-1">
              Filter role: {filterRole ? `${getRoleDisplayLabel(filterRole)} (${getRoleCode(filterRole)})` : 'Semua'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-surface/60 bg-surface/20 px-2.5 py-1">
              Filter status: {filterStatus === 'active' ? 'Aktif' : filterStatus === 'inactive' ? 'Nonaktif' : 'Semua'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-surface/60 bg-surface/20 px-2.5 py-1">
              Query: {searchRaw.trim() || 'Tidak ada'}
            </span>
          </div>
        </div>

        {/* Bulk selection toolbar */}
        {selectedUserIds.size > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-blue-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-xs font-bold">{selectedUserIds.size}</span>
              personel dipilih
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowBulkReset(true)}>
                <ICONS.Key className="h-3.5 w-3.5" aria-hidden="true" />
                Reset PIN
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setBatchOperation('toggle-active')}>
                <ICONS.ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                Toggle Status
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setBatchOperation('role-change')}>
                <ICONS.Shield className="h-3.5 w-3.5" aria-hidden="true" />
                Ubah Role
              </Button>
              {isRoleAdmin(authUser?.role) && (
                <Button size="sm" variant="danger" onClick={() => setBatchOperation('delete')}>
                  <ICONS.Trash className="h-3.5 w-3.5" aria-hidden="true" />
                  Hapus
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())}>
                Batal
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <>
          <Table
            columns={[
              {
                key: 'select',
                header: (
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedUserIds.size === users.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-surface accent-primary cursor-pointer"
                    title="Pilih semua di halaman ini"
                  />
                ),
                render: (u) => (
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(u.id)}
                    onChange={() => toggleSelectUser(u.id)}
                    className="h-4 w-4 rounded border-surface accent-primary cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                ),
              },
              { key: 'nrp', header: 'NRP', render: (u) => <span className="font-mono text-sm">{u.nrp}</span> },
              { key: 'nama', header: 'Nama' },
              { key: 'pangkat', header: 'Pangkat', render: (u) => u.pangkat ?? '—' },
              { key: 'jabatan', header: 'Jabatan', render: (u) => u.jabatan ?? '—' },
              { key: 'satuan', header: 'Satuan' },
              { key: 'role', header: 'Role', render: (u) => <RoleBadge role={u.role} /> },
              {
                key: 'is_online', header: 'Status', render: (u) => {
                  const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
                  return (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${u.is_online ? 'bg-success' : 'bg-text-muted'}`} />
                        <span className="text-xs text-text-muted">{u.is_online ? 'Online' : 'Offline'}</span>
                      </div>
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-red/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-red">
                          <ICONS.Lock className="h-2.5 w-2.5" aria-hidden="true" />
                          Terkunci
                        </span>
                      )}
                      {!u.is_active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface/50 px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                          Nonaktif
                        </span>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'actions', header: 'Aksi', render: (u) => (
                  <UserTableActions
                    user={u}
                    currentUserId={authUser?.id}
                    onDetail={() => handleOpenDetail(u)}
                    onResetPin={() => { setSelectedUser(u); setShowResetPin(true); }}
                    onRoleEdit={() => openRoleEdit(u)}
                    onToggleActive={() => handleToggleActive(u)}
                    onUnlock={() => { setSelectedUser(u); setShowUnlock(true); }}
                    onDelete={() => { setSelectedUser(u); setShowDelete(true); }}
                  />
                ),
              },
            ]}
            data={users}
            keyExtractor={(u) => u.id}
            isLoading={false}
            caption="Tabel manajemen personel berdasarkan filter role, status, dan pencarian"
            emptyMessage="Tidak ada personel ditemukan"
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
          </>
        )}
      </div>

      <CreateUserModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        isSaving={isSaving}
        satuans={satuans}
        isSatuansLoading={isSatuansLoading}
        onSave={async (data) => {
          setIsSaving(true);
          try {
            await createUser({ ...data, is_active: true });
            showNotification('Personel berhasil ditambahkan', 'success');
            setPage(1);
            setShowCreate(false);
          } catch (err) {
            throw err;
          } finally {
            setIsSaving(false);
          }
        }}
        onError={(msg) => showNotification(msg, 'error')}
        onSuccess={(msg) => showNotification(msg, 'success')}
      />

      <ResetPinModal
        isOpen={showResetPin}
        onClose={() => setShowResetPin(false)}
        isSaving={isSaving}
        user={selectedUser}
        onSave={async (userId, pin) => {
          setIsSaving(true);
          try {
            await resetUserPin(userId, pin);
          } finally {
            setIsSaving(false);
          }
        }}
        onError={(msg) => showNotification(msg, 'error')}
        onSuccess={(msg) => {
          showNotification(msg, 'success');
          setShowResetPin(false);
          setSelectedUser(null);
        }}
      />

      <BulkResetPinModal
        isOpen={showBulkReset}
        onClose={() => setShowBulkReset(false)}
        isSaving={isSaving}
        selectedUsers={users.filter((u) => selectedUserIds.has(u.id))}
        onSave={handleBulkResetPin}
        onError={(msg) => showNotification(msg, 'error')}
        onSuccess={(msg) => {
          showNotification(msg, 'success');
          setShowBulkReset(false);
          setSelectedUserIds(new Set());
        }}
      />

      <ImportPersonelModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        isSaving={isImporting}
        onImport={handleImportFile}
        onError={(msg) => showNotification(msg, 'error')}
        onSuccess={(msg) => {
          showNotification(msg, 'success');
          setShowImport(false);
          setPage(1);
        }}
      />

      <RoleEditModal
        isOpen={showRoleEdit}
        onClose={() => setShowRoleEdit(false)}
        isSaving={isSaving}
        user={roleEditUser}
        onSave={handleRoleUpdate}
        onError={(msg) => showNotification(msg, 'error')}
        onSuccess={(msg) => {
          showNotification(msg, 'success');
          setShowRoleEdit(false);
          setRoleEditUser(null);
        }}
      />

      {/* User Detail Modal */}
      <UserDetailModal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setDetailUser(null); }}
        user={detailUser}
        viewerRole="admin"
        mode="edit"
        onSave={handleSaveDetail}
      />

      <DeleteUserModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        isSaving={isSaving}
        user={selectedUser}
        isCurrentUser={authUser?.id === selectedUser?.id}
        onDelete={handleDeleteUser}
        onError={(msg) => showNotification(msg, 'error')}
        onSuccess={(msg) => {
          showNotification(msg, 'success');
          setShowDelete(false);
          setSelectedUser(null);
        }}
      />

      <UnlockUserModal
        isOpen={showUnlock}
        onClose={() => setShowUnlock(false)}
        isSaving={isSaving}
        user={selectedUser}
        onUnlock={handleUnlockUser}
        onError={(msg) => showNotification(msg, 'error')}
        onSuccess={(msg) => {
          showNotification(msg, 'success');
          setShowUnlock(false);
          setSelectedUser(null);
        }}
      />

      {/* Batch Operation Modals */}
      <BatchOperationModals
        isOpen={!!batchOperation}
        operationType={batchOperation}
        selectedUsers={users.filter((u) => selectedUserIds.has(u.id))}
        isSaving={isBatchProcessing}
        onDelete={handleBatchDelete}
        onToggleActive={handleBatchToggleActive}
        onRoleChange={handleBatchRoleChange}
        onClose={() => setBatchOperation(null)}
      />
    </DashboardLayout>
  );
}
