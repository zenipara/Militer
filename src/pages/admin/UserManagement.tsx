import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/ui/Table';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { RoleBadge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Skeleton';
import { useUsers } from '../../hooks/useUsers';
import { useUIStore } from '../../store/uiStore';
import { useDebounce } from '../../hooks/useDebounce';
import type { User, Role } from '../../types';

export default function UserManagement() {
  const { users, isLoading, createUser, toggleUserActive, resetUserPin } = useUsers();
  const { showNotification } = useUIStore();

  const [searchRaw, setSearchRaw] = useState('');
  const search = useDebounce(searchRaw, 300);
  const [filterRole, setFilterRole] = useState<Role | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [showResetPin, setShowResetPin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  const [form, setForm] = useState({ nrp: '', nama: '', pin: '', role: 'prajurit' as Role, satuan: '', pangkat: '' });
  const [newPin, setNewPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.nama.toLowerCase().includes(search.toLowerCase()) ||
      u.nrp.includes(search);
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

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

  const handleToggleActive = async (u: User) => {
    try {
      await toggleUserActive(u.id, !u.is_active);
      showNotification(`Akun ${u.nama} ${!u.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } catch {
      showNotification('Gagal mengubah status akun', 'error');
    }
  };

  return (
    <DashboardLayout title="Manajemen Personel">
      <div className="space-y-5">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Cari nama atau NRP..."
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            className="flex-1 rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as Role | '')}
            className="rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="komandan">Komandan</option>
            <option value="prajurit">Prajurit</option>
          </select>
          <Button onClick={() => setShowCreate(true)}>+ Tambah Personel</Button>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
        <Table
          columns={[
            { key: 'nrp', header: 'NRP', render: (u) => <span className="font-mono text-sm">{u.nrp}</span> },
            { key: 'nama', header: 'Nama' },
            { key: 'pangkat', header: 'Pangkat', render: (u) => u.pangkat ?? '—' },
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
          data={filtered}
          keyExtractor={(u) => u.id}
          isLoading={false}
          emptyMessage="Tidak ada personel ditemukan"
        />
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
            <label className="text-sm font-medium text-text-primary">Role *</label>
            <select className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
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
    </DashboardLayout>
  );
}
