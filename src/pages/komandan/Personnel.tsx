import { useState } from 'react';
import { Search } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/ui/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import PageHeader from '../../components/ui/PageHeader';
import { RoleBadge } from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Skeleton';
import UserDetailModal from '../../components/common/UserDetailModal';
import { useUsers } from '../../hooks/useUsers';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuthStore } from '../../store/authStore';
import { getKomandanScopeLabel, getKomandanScopeDescription } from '../../lib/rolePermissions';
import type { User } from '../../types';

export default function Personnel() {
  const { user } = useAuthStore();
  const { users, isLoading, error, getUserById } = useUsers({ satuan: user?.satuan, isActive: true });

  const [searchRaw, setSearchRaw] = useState('');
  const [filterOnline, setFilterOnline] = useState<'all' | 'online' | 'offline'>('all');
  const search = useDebounce(searchRaw, 300);
  const [showDetail, setShowDetail] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      u.nama.toLowerCase().includes(q) ||
      u.nrp.includes(search) ||
      (u.pangkat?.toLowerCase().includes(q) ?? false) ||
      (u.jabatan?.toLowerCase().includes(q) ?? false);
    const matchOnline =
      filterOnline === 'all' ||
      (filterOnline === 'online' ? u.is_online : !u.is_online);
    return matchSearch && matchOnline;
  });

  const onlineCount = users.filter((u) => u.is_online).length;

  const handleOpenDetail = async (u: User) => {
    try {
      const full = await getUserById(u.id);
      setDetailUser(full);
    } catch {
      setDetailUser(u);
    }
    setShowDetail(true);
  };

  const scopeLabel = user?.role === 'komandan' ? getKomandanScopeLabel(user.level_komando) : null;
  const scopeDescription = user?.role === 'komandan' ? getKomandanScopeDescription(user.level_komando) : null;

  return (
    <DashboardLayout title="Data Personel">
      <div className="space-y-5">
        <PageHeader
          title="Data Personel"
          subtitle="Pantau status online, cari personel, dan lihat data keaktifan satuan secara cepat."
        />

        {/* Komandan scope info banner */}
        {scopeLabel && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/8 px-4 py-3">
            <span className="mt-0.5 text-base" aria-hidden="true">🎖️</span>
            <div>
              <p className="text-sm font-semibold text-primary">{scopeLabel}</p>
              <p className="mt-0.5 text-xs text-text-muted">{scopeDescription}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 p-4 text-sm text-accent-red">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
            <span className="text-sm text-text-muted">
              <span className="font-bold text-success">{onlineCount}</span> online
            </span>
          </div>
          <span className="text-text-muted/40">|</span>
          <span className="text-sm text-text-muted">
            Total <span className="font-bold text-text-primary">{users.length}</span> personel aktif di <span className="font-medium text-text-primary">{user?.satuan}</span>
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            placeholder="Cari nama, NRP, pangkat..."
            value={searchRaw}
            onChange={(e) => setSearchRaw(e.target.value)}
            leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
            className="flex-1"
          />
          <div className="flex gap-1 bg-surface/40 rounded-lg p-1">
            {(['all', 'online', 'offline'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilterOnline(opt)}
                aria-pressed={filterOnline === opt}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterOnline === opt ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {opt !== 'all' && (
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    opt === 'online' ? 'bg-success' : 'bg-text-muted/60'
                  }`} aria-hidden="true" />
                )}
                {opt === 'all' ? 'Semua' : opt === 'online' ? 'Online' : 'Offline'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <Table<User>
            columns={[
              { key: 'nrp', header: 'NRP', render: (u) => <span className="font-mono text-sm">{u.nrp}</span> },
              { key: 'nama', header: 'Nama' },
              { key: 'pangkat', header: 'Pangkat', render: (u) => u.pangkat ?? '—' },
              { key: 'jabatan', header: 'Jabatan', render: (u) => u.jabatan ?? '—' },
              { key: 'role', header: 'Role', render: (u) => <RoleBadge role={u.role} /> },
              {
                key: 'is_online',
                header: 'Status',
                render: (u) => (
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${u.is_online ? 'bg-success animate-pulse' : 'bg-text-muted/40'}`} />
                    <span className={`text-xs ${u.is_online ? 'text-success' : 'text-text-muted'}`}>
                      {u.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'last_login',
                header: 'Login Terakhir',
                render: (u) => u.last_login
                  ? new Date(u.last_login).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                  : '—',
              },
              {
                key: 'actions',
                header: 'Aksi',
                render: (u) => (
                  <Button size="sm" variant="secondary" onClick={() => handleOpenDetail(u)}>
                    Detail
                  </Button>
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

      <UserDetailModal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setDetailUser(null); }}
        user={detailUser}
        viewerRole="komandan"
        mode="view"
      />
    </DashboardLayout>
  );
}
