import { useState } from 'react';
import { Megaphone, Pin, PinOff, Plus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/ui/PageHeader';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useUIStore } from '../../store/uiStore';
import type { Announcement, Role } from '../../types';

export default function Announcements() {
  const { announcements, isLoading, createAnnouncement, deleteAnnouncement, togglePin } = useAnnouncements();
  const { showNotification } = useUIStore();

  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    judul: '',
    isi: '',
    target_satuan: '',
    is_pinned: false,
    target_admin: false,
    target_komandan: false,
    target_prajurit: false,
  });

  const handleCreate = async () => {
    if (!form.judul.trim() || !form.isi.trim()) {
      showNotification('Judul dan isi pengumuman wajib diisi', 'error');
      return;
    }
    const targetRole: Role[] = [];
    if (form.target_admin) targetRole.push('admin');
    if (form.target_komandan) targetRole.push('komandan');
    if (form.target_prajurit) targetRole.push('prajurit');

    setIsSaving(true);
    try {
      await createAnnouncement({
        judul: form.judul,
        isi: form.isi,
        target_role: targetRole.length > 0 ? targetRole : undefined,
        target_satuan: form.target_satuan || undefined,
        is_pinned: form.is_pinned,
      });
      showNotification('Pengumuman berhasil diterbitkan', 'success');
      setShowCreate(false);
      setForm({ judul: '', isi: '', target_satuan: '', is_pinned: false, target_admin: false, target_komandan: false, target_prajurit: false });
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal menerbitkan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteAnnouncement(confirmDeleteId);
      showNotification('Pengumuman dihapus', 'success');
      setConfirmDeleteId(null);
    } catch {
      showNotification('Gagal menghapus', 'error');
      setConfirmDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePin = async (ann: Announcement) => {
    try {
      await togglePin(ann.id, ann.is_pinned);
      showNotification(ann.is_pinned ? 'Pengumuman di-unpin' : 'Pengumuman di-pin', 'info');
    } catch {
      showNotification('Gagal mengubah pin', 'error');
    }
  };

  return (
    <DashboardLayout title="Manajemen Pengumuman">
      <div className="space-y-5">
        <PageHeader
          title="Manajemen Pengumuman"
          subtitle="Publikasikan informasi resmi berdasarkan role dan satuan dengan prioritas pin."
          meta={<span>Total pengumuman: {announcements.length}</span>}
          actions={<Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="h-4 w-4" />}>Buat Pengumuman</Button>}
        />

        {isLoading ? (
          <LoadingSpinner message="Memuat pengumuman..." />
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-6 w-6" aria-hidden="true" />}
            title="Belum ada pengumuman"
            description="Buat pengumuman untuk menginformasikan hal penting kepada personel."
          />
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`app-card p-5 ${ann.is_pinned ? 'border-accent-gold/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {ann.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-xs text-accent-gold font-medium">
                          <Pin className="h-3 w-3" aria-hidden="true" /> Disematkan
                        </span>
                      )}
                      <h3 className="font-semibold text-text-primary">{ann.judul}</h3>
                    </div>
                    <p className="text-sm text-text-muted whitespace-pre-line">{ann.isi}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-text-muted">
                        {new Date(ann.created_at).toLocaleString('id-ID')}
                      </span>
                      {ann.creator && (
                        <span className="text-xs text-text-muted">oleh {ann.creator.nama}</span>
                      )}
                      {ann.target_role && ann.target_role.length > 0 && (
                        <div className="flex gap-1">
                          {ann.target_role.map((r) => (
                            <Badge key={r} variant="info" size="sm">{r}</Badge>
                          ))}
                        </div>
                      )}
                      {ann.target_satuan && (
                        <Badge variant="neutral" size="sm">{ann.target_satuan}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTogglePin(ann)}
                      title={ann.is_pinned ? 'Lepas Pin' : 'Sematkan'}
                      aria-label={ann.is_pinned ? 'Lepas pin pengumuman' : 'Sematkan pengumuman'}
                    >
                      {ann.is_pinned
                        ? <PinOff className="h-4 w-4" aria-hidden="true" />
                        : <Pin className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(ann.id)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Buat Pengumuman Baru"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleCreate} isLoading={isSaving}>Terbitkan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Judul *"
            type="text"
            value={form.judul}
            onChange={(e) => setForm({ ...form, judul: e.target.value })}
            required
          />
          <div>
            <label className="text-sm font-semibold text-text-primary">Isi Pengumuman *</label>
            <textarea
              className="form-control mt-1 min-h-28"
              rows={5}
              placeholder="Tulis pengumuman di sini..."
              value={form.isi}
              onChange={(e) => setForm({ ...form, isi: e.target.value })}
            />
          </div>
          <Input
            label="Target Satuan (kosong = semua)"
            type="text"
            placeholder="Batalyon 1, Kompi A, dll."
            value={form.target_satuan}
            onChange={(e) => setForm({ ...form, target_satuan: e.target.value })}
          />
          <div>
            <p className="mb-2 text-sm font-semibold text-text-primary">Target Role (kosong = semua)</p>
            <div className="flex gap-4">
              {(['admin', 'komandan', 'prajurit'] as const).map((r) => {
                const key = `target_${r}` as 'target_admin' | 'target_komandan' | 'target_prajurit';
                return (
                  <label key={r} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      className="rounded border-surface text-primary focus:ring-primary/50"
                    />
                    <span className="text-sm text-text-muted capitalize">{r}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
              className="rounded border-surface text-primary"
            />
            <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
              <Pin className="h-3.5 w-3.5" aria-hidden="true" /> Sematkan pengumuman ini
            </span>
          </label>
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => { if (!isDeleting) setConfirmDeleteId(null); }}
        onConfirm={() => { void handleConfirmDelete(); }}
        title="Hapus Pengumuman"
        message="Pengumuman ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        isConfirming={isDeleting}
      />
    </DashboardLayout>
  );
}
