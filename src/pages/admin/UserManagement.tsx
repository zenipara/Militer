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
import { useUsers } from '../../hooks/useUsers';
import { useSatuans } from '../../hooks/useSatuans';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useDebounce } from '../../hooks/useDebounce';
import { ICONS } from '../../icons';
import { supabase } from '../../lib/supabase';
import type { User, Role } from '../../types';

const PAGE_SIZE = 50;

/** Parse CSV text into array of objects keyed by header row. */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
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
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Form state
  const [form, setForm] = useState({ nrp: '', nama: '', pin: '', role: 'prajurit' as Role, satuan: '', pangkat: '' });
  const [newPin, setNewPin] = useState('');
  const [bulkPin, setBulkPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // CSV import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: { nrp: string; error: string }[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
    if (!form.nrp || !form.nama || !form.pin || !form.satuan) {
      showNotification('Harap isi semua field wajib', 'error');
      return;
    }
    if (!/^\d{6}$/.test(form.pin)) {
      showNotification('PIN harus 6 digit angka', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await createUser({ ...form, is_active: true });
      showNotification('Personel berhasil ditambahkan', 'success');
      setPage(1);
      setShowCreate(false);
      setForm({ nrp: '', nama: '', pin: '', role: 'prajurit', satuan: '', pangkat: '' });
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
    if (!/^\d{6}$/.test(newPin)) {
      showNotification('PIN baru harus 6 digit angka', 'error');
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
    if (!/^\d{6}$/.test(bulkPin)) {
      showNotification('PIN baru harus 6 digit angka', 'error');
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
      const rows = parseCSV(text);
      setImportRows(rows);
      setImportResult(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImport = async () => {
    if (importRows.length === 0) {
      showNotification('File CSV kosong atau format tidak valid', 'error');
      return;
    }
    setIsImporting(true);
    try {
      const payload = importRows.map((r) => ({
        nrp: r['nrp'] ?? '',
        pin: r['pin'] ?? '123456',
        nama: r['nama'] ?? '',
        role: r['role'] ?? 'prajurit',
        satuan: r['satuan'] ?? '',
        pangkat: r['pangkat'] ?? '',
        jabatan: r['jabatan'] ?? '',
      }));
      const { data, error } = await supabase.rpc('import_users_csv', { p_users: payload });
      if (error) throw error;
      const result = data as { success: number; failed: number; errors: { nrp: string; error: string }[] };
      setImportResult(result);
      if (result.success > 0) {
        showNotification(`${result.success} personel berhasil diimpor`, 'success');
        setPage(1);
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal mengimpor data', 'error');
    } finally {
      setIsImporting(false);
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
              <option value="admin">Admin</option>
              <option value="komandan">Komandan</option>
              <option value="staf">Staf</option>
              <option value="prajurit">Prajurit</option>
              <option value="guard">Guard</option>
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
              Filter role: {filterRole || 'Semua'}
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
                Reset PIN Massal
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())}>
                Batal Pilih
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
                key: 'actions', header: 'Aksi', render: (u) => {
                  const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenDetail(u)}
                      >
                        Detail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedUser(u); setShowResetPin(true); }}
                      >
                        Reset PIN
                      </Button>
                      {isLocked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedUser(u); setShowUnlock(true); }}
                        >
                          <span className="flex items-center gap-1 text-accent-gold">
                            <ICONS.Unlock className="h-3 w-3" aria-hidden="true" />
                            Buka Kunci
                          </span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={u.is_active ? 'ghost' : 'secondary'}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.is_active ? 'Nonaktif' : 'Aktifkan'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={authUser?.id === u.id}
                        onClick={() => { setSelectedUser(u); setShowDelete(true); }}
                      >
                        Hapus
                      </Button>
                    </div>
                  );
                },
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

      {/* Create User Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tambah Personel Baru"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleCreate} isLoading={isSaving}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="NRP *" type="text" inputMode="numeric" maxLength={20} value={form.nrp} onChange={(e) => setForm({ ...form, nrp: e.target.value.replace(/\D/g, '') })} required />
          <Input label="Nama Lengkap *" type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
          <Input label="Pangkat" type="text" value={form.pangkat} onChange={(e) => setForm({ ...form, pangkat: e.target.value })} />
          {satuans.length > 0 ? (
            <SatuanSelector
              label="Satuan"
              required
              value={form.satuan}
              onChange={(value) => setForm({ ...form, satuan: value })}
              satuans={satuans}
              disabled={isSatuansLoading}
            />
          ) : (
            <Input label="Satuan *" type="text" value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} required />
          )}
          <div>
            <label className="text-sm font-semibold text-text-primary">Role *</label>
            <select className="form-control mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="prajurit">Prajurit</option>
              <option value="staf">Staf Operasional</option>
              <option value="komandan">Komandan</option>
              <option value="guard">Guard</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Input label="PIN Awal *" type="password" inputMode="numeric" maxLength={6} helpText="6 digit angka" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} required />
        </div>
      </Modal>

      {/* Reset PIN Modal */}
      <Modal
        isOpen={showResetPin}
        onClose={() => { setShowResetPin(false); setNewPin(''); }}
        title={`Reset PIN — ${selectedUser?.nama}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowResetPin(false)}>Batal</Button>
            <Button onClick={handleResetPin} isLoading={isSaving}>Reset PIN</Button>
          </>
        }
      >
        <Input
          label="PIN Baru *"
          type="password"
          inputMode="numeric"
          maxLength={6}
          helpText="6 digit angka"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
        />
      </Modal>

      {/* Bulk PIN Reset Modal */}
      <Modal
        isOpen={showBulkReset}
        onClose={() => { setShowBulkReset(false); setBulkPin(''); }}
        title={`Reset PIN Massal — ${selectedUserIds.size} Personel`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBulkReset(false)}>Batal</Button>
            <Button onClick={handleBulkResetPin} isLoading={isSaving} variant="danger">
              Reset {selectedUserIds.size} PIN
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-accent-gold/30 bg-gradient-to-r from-amber-50/80 to-transparent p-4 dark:from-amber-900/10">
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-accent-gold/15 text-accent-gold text-xs font-bold">⚠</span>
            <p className="text-xs text-text-muted leading-relaxed">
              Semua <span className="font-semibold text-accent-gold">{selectedUserIds.size}</span> personel yang dipilih akan mendapat PIN yang sama. Pastikan PIN disebarkan dengan aman.
            </p>
          </div>
          <Input
            label="PIN Baru untuk Semua *"
            type="password"
            inputMode="numeric"
            maxLength={6}
            helpText="6 digit angka"
            value={bulkPin}
            onChange={(e) => setBulkPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        isOpen={showImport}
        onClose={() => { setShowImport(false); setImportRows([]); setImportResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        title="Import Personel dari CSV"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowImport(false); setImportRows([]); setImportResult(null); }}>Tutup</Button>
            <Button variant="secondary" onClick={downloadTemplate}>⬇ Unduh Template</Button>
            {importRows.length > 0 && !importResult && (
              <Button onClick={handleImport} isLoading={isImporting}>
                Import {importRows.length} Personel
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {!importResult ? (
            <>
              <div className="rounded-2xl border border-surface/60 bg-surface/15 p-4 text-sm text-text-muted space-y-1.5">
                <p className="font-bold text-text-primary flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs">📋</span>
                  Format CSV yang diperlukan:
                </p>
                <p>Kolom: <code className="font-mono text-xs bg-surface/50 px-1.5 py-0.5 rounded-md">nrp, nama, pin, role, satuan, pangkat, jabatan</code></p>
                <p>• PIN default 6 digit angka (contoh: 123456)</p>
                <p>• Role: <code className="font-mono text-xs">prajurit</code> / <code className="font-mono text-xs">staf</code> / <code className="font-mono text-xs">komandan</code> / <code className="font-mono text-xs">guard</code> / <code className="font-mono text-xs">admin</code></p>
                <p>• Unduh template di bawah untuk format yang tepat</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-text-primary">Pilih File CSV</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              {importRows.length > 0 && (
                <div className="rounded-2xl border border-surface/60 bg-surface/15 p-4">
                  <p className="text-sm font-bold text-text-primary mb-2">
                    Preview — <span className="text-primary">{importRows.length}</span> baris ditemukan
                  </p>
                  <div className="overflow-x-auto max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface/70">
                          {Object.keys(importRows[0]).map((h) => (
                            <th key={h} className="text-left py-1 pr-3 text-text-muted font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-surface/40">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="py-1 pr-3 text-text-primary">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importRows.length > 5 && (
                      <p className="mt-1 text-xs text-text-muted">... dan {importRows.length - 5} baris lainnya</p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-success/30 bg-gradient-to-br from-success/10 to-emerald-500/5 p-5 text-center">
                  <p className="text-3xl font-black text-success">{importResult.success}</p>
                  <p className="mt-1 text-xs font-semibold text-text-muted">Berhasil diimpor</p>
                </div>
                <div className={`rounded-2xl border p-5 text-center ${importResult.failed > 0 ? 'border-accent-red/30 bg-gradient-to-br from-accent-red/10 to-rose-500/5' : 'border-surface/60 bg-surface/15'}`}>
                  <p className={`text-3xl font-black ${importResult.failed > 0 ? 'text-accent-red' : 'text-text-muted'}`}>{importResult.failed}</p>
                  <p className="mt-1 text-xs font-semibold text-text-muted">Gagal diimpor</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="rounded-2xl border border-accent-red/20 bg-accent-red/10 p-4 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-xs font-bold text-accent-red mb-2">Detail Error:</p>
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="font-mono font-bold text-accent-red/80">{e.nrp}</span>
                      <span className="text-text-muted">{e.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* User Detail Modal */}
      <UserDetailModal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setDetailUser(null); }}
        user={detailUser}
        viewerRole="admin"
        mode="edit"
        onSave={handleSaveDetail}
      />

      <Modal
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelectedUser(null); }}
        title="Hapus Data Anggota"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowDelete(false); setSelectedUser(null); }}>Batal</Button>
            <Button variant="danger" onClick={() => void handleDeleteUser()} isLoading={isSaving}>Ya, Hapus</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-accent-red/20 bg-accent-red/5 p-4">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-red/20 to-rose-500/10 text-accent-red text-sm font-black">
              {selectedUser?.nama.charAt(0).toUpperCase() ?? '?'}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-text-primary truncate">{selectedUser?.nama ?? '-'}</p>
              <p className="text-xs text-text-muted">NRP {selectedUser?.nrp ?? '-'} · {selectedUser?.role}</p>
            </div>
          </div>
          <p className="text-sm text-text-muted">
            Data anggota ini akan dihapus secara permanen. Tindakan ini <span className="font-semibold text-accent-red">tidak dapat dibatalkan</span>.
          </p>
        </div>
      </Modal>

      {/* Unlock Modal */}
      <Modal
        isOpen={showUnlock}
        onClose={() => { setShowUnlock(false); setSelectedUser(null); }}
        title="Buka Kunci Akun"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowUnlock(false); setSelectedUser(null); }}>Batal</Button>
            <Button onClick={() => void handleUnlockUser()} isLoading={isSaving}>
              <span className="flex items-center gap-1.5">
                <ICONS.Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                Buka Kunci
              </span>
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-accent-gold/20 bg-accent-gold/5 p-4">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-gold/20 to-amber-500/10 text-accent-gold">
              <ICONS.Lock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-text-primary truncate">{selectedUser?.nama ?? '-'}</p>
              <p className="text-xs text-text-muted">NRP {selectedUser?.nrp ?? '-'} · {selectedUser?.login_attempts ?? 0}× percobaan gagal</p>
            </div>
          </div>
          <p className="text-sm text-text-muted">
            Akun ini terkunci karena terlalu banyak percobaan login gagal. Membuka kunci akan mengizinkan personel login kembali.
          </p>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
