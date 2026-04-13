import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useUIStore } from '../../store/uiStore';
import type { Announcement, Role } from '../../types';

export default function Announcements() {
  const { announcements, isLoading, createAnnouncement, deleteAnnouncement, togglePin } = useAnnouncements();
  const { showNotification } = useUIStore();

  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus pengumuman ini?')) return;
    try {
      await deleteAnnouncement(id);
      showNotification('Pengumuman dihapus', 'success');
    } catch {
      showNotification('Gagal menghapus', 'error');
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
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)}>+ Buat Pengumuman</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface border-t-primary" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-bg-card border border-surface rounded-xl p-10 text-center text-text-muted">
            Belum ada pengumuman
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`bg-bg-card border rounded-xl p-5 ${ann.is_pinned ? 'border-accent-gold/50' : 'border-surface'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {ann.is_pinned && (
                        <span className="text-xs text-accent-gold font-medium">📌 Disematkan</span>
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
                    >
                      {ann.is_pinned ? '📌' : '📍'}
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
            <label className="text-sm font-medium text-text-primary">Isi Pengumuman *</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
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
            <p className="text-sm font-medium text-text-primary mb-2">Target Role (kosong = semua)</p>
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
            <span className="text-sm text-text-muted">📌 Sematkan pengumuman ini</span>
          </label>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
