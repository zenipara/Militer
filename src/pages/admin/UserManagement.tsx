import { useState, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/ui/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import PageHeader from '../../components/ui/PageHeader';
import { RoleBadge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Skeleton';
import Pagination from '../../components/ui/Pagination';
import UserDetailModal from '../../components/common/UserDetailModal';
import { usePagination } from '../../hooks/usePagination';
import { useUsers } from '../../hooks/useUsers';
import { useUIStore } from '../../store/uiStore';
import { useDebounce } from '../../hooks/useDebounce';
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
  const { users, isLoading, createUser, updateUser, toggleUserActive, resetUserPin, getUserById } = useUsers({ orderBy: 'created_at', ascending: false });
  const { showNotification } = useUIStore();

  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 300);
  const [filterRole, setFilterRole] = useState<Role | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [showResetPin, setShowResetPin] = useState(false);
  const [showBulkReset, setShowBulkReset] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
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

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.nama.toLowerCase().includes(search.toLowerCase()) ||
      u.nrp.includes(search);
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const { currentPage, totalPages, totalItems, paginated, setPage } = usePagination(filtered, PAGE_SIZE);

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
      showNotification(err instanceof Error ? err.message : 'Gagal menambah personel', 'error');
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

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === paginated.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(paginated.map((u) => u.id)));
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
    // Refresh detail user after save
    const refreshed = await getUserById(id);
    setDetailUser(refreshed);
  };

  return (
    <DashboardLayout title="Manajemen Personel">
      <div className="space-y-5">
        <PageHeader
          title="Manajemen Personel"
          subtitle="Kelola akun, role, status aktif, reset PIN personel, dan impor data massal."
        />

        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Cari nama atau NRP..."
            value={searchRaw}
            onChange={(e) => { setSearchRaw(e.target.value); setPage(1); }}
            className="form-control flex-1"
          />
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value as Role | ''); setPage(1); }}
            className="form-control sm:w-44"
          >
            <option value="">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="komandan">Komandan</option>
            <option value="prajurit">Prajurit</option>
          </select>
          <Button variant="secondary" onClick={() => setShowImport(true)}>⬆ Import CSV</Button>
          <Button onClick={() => setShowCreate(true)}>+ Tambah Personel</Button>
        </div>

        {/* Bulk selection toolbar */}
        {selectedUserIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5">
            <span className="text-sm font-medium text-primary">{selectedUserIds.size} personel dipilih</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowBulkReset(true)}
            >
              Reset PIN Massal
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedUserIds(new Set())}
            >
              Batal Pilih
            </Button>
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
                    checked={paginated.length > 0 && selectedUserIds.size === paginated.length}
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
                key: 'is_online', header: 'Status', render: (u) => (
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${u.is_online ? 'bg-success' : 'bg-text-muted'}`} />
                    <span className="text-xs text-text-muted">{u.is_online ? 'Online' : 'Offline'}</span>
                  </div>
                ),
              },
              {
                key: 'actions', header: 'Aksi', render: (u) => (
                  <div className="flex items-center gap-2">
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
                    <Button
                      size="sm"
                      variant={u.is_active ? 'ghost' : 'secondary'}
                      onClick={() => handleToggleActive(u)}
                    >
                      {u.is_active ? 'Nonaktif' : 'Aktifkan'}
                    </Button>
                  </div>
                ),
              },
            ]}
            data={paginated}
            keyExtractor={(u) => u.id}
            isLoading={false}
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
          <Input label="Satuan *" type="text" value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} required />
          <div>
            <label className="text-sm font-semibold text-text-primary">Role *</label>
            <select className="form-control mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="prajurit">Prajurit</option>
              <option value="komandan">Komandan</option>
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
          <div className="rounded-xl border border-accent-gold/30 bg-accent-gold/10 p-3">
            <p className="text-xs text-accent-gold">
              ⚠ Semua {selectedUserIds.size} personel yang dipilih akan mendapat PIN yang sama. Pastikan PIN disebarkan dengan aman.
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
              <div className="rounded-xl border border-surface/70 bg-surface/20 p-4 text-sm text-text-muted space-y-1">
                <p className="font-semibold text-text-primary">Format CSV yang diperlukan:</p>
                <p>Kolom: <code className="font-mono text-xs bg-surface/50 px-1 rounded">nrp, nama, pin, role, satuan, pangkat, jabatan</code></p>
                <p>• PIN default 6 digit angka (contoh: 123456)</p>
                <p>• Role: <code className="font-mono text-xs">prajurit</code> / <code className="font-mono text-xs">komandan</code> / <code className="font-mono text-xs">admin</code></p>
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
                <div className="rounded-xl border border-surface/70 bg-surface/20 p-4">
                  <p className="text-sm font-semibold text-text-primary mb-2">
                    Preview — {importRows.length} baris ditemukan
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
                <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-center">
                  <p className="text-2xl font-bold text-success">{importResult.success}</p>
                  <p className="text-xs text-text-muted">Berhasil diimpor</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${importResult.failed > 0 ? 'border-accent-red/30 bg-accent-red/10' : 'border-surface/70 bg-surface/20'}`}>
                  <p className={`text-2xl font-bold ${importResult.failed > 0 ? 'text-accent-red' : 'text-text-muted'}`}>{importResult.failed}</p>
                  <p className="text-xs text-text-muted">Gagal diimpor</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-accent-red/20 bg-accent-red/10 p-4 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-accent-red mb-2">Detail Error:</p>
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-mono text-accent-red/80">{e.nrp}</span>
                      <span className="text-text-muted ml-2">{e.error}</span>
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
    </DashboardLayout>
  );
}
