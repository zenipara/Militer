import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { useLeaveRequests } from '../../hooks/useLeaveRequests';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { LeaveRequest } from '../../types';

function LeaveStatusBadge({ status }: { status: string }) {
  const map = {
    pending: { variant: 'warning', label: 'Menunggu' },
    approved: { variant: 'success', label: 'Disetujui' },
    rejected: { variant: 'error', label: 'Ditolak' },
  } as const;
  const cfg = map[status as keyof typeof map] ?? { variant: 'neutral' as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function LeaveRequest() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { requests, isLoading, submitLeaveRequest } = useLeaveRequests({ userId: user?.id });

  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReq, setSelectedReq] = useState<LeaveRequest | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    jenis_izin: 'cuti' as 'cuti' | 'sakit' | 'dinas_luar',
    tanggal_mulai: today,
    tanggal_selesai: today,
    alasan: '',
  });

  const handleSubmit = async () => {
    if (!form.alasan.trim()) {
      showNotification('Alasan wajib diisi', 'error');
      return;
    }
    if (form.tanggal_selesai < form.tanggal_mulai) {
      showNotification('Tanggal selesai harus sama atau setelah tanggal mulai', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitLeaveRequest(form);
      showNotification('Permohonan izin berhasil dikirim', 'success');
      setShowCreate(false);
      setForm({ jenis_izin: 'cuti', tanggal_mulai: today, tanggal_selesai: today, alasan: '' });
    } catch {
      showNotification('Gagal mengirim permohonan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcDuration = (from: string, to: string) => {
    const diff = Math.round(
      (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
    return diff;
  };

  const jenisLabel: Record<string, string> = {
    cuti: '🏖 Cuti',
    sakit: '🤒 Sakit',
    dinas_luar: '📋 Dinas Luar',
  };

  const pending = requests.filter((r) => r.status === 'pending').length;
  const approved = requests.filter((r) => r.status === 'approved').length;

  return (
    <DashboardLayout title="Permohonan Izin">
      <div className="space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: requests.length, color: 'text-text-primary' },
            { label: 'Disetujui', value: approved, color: 'text-success' },
            { label: 'Menunggu', value: pending, color: 'text-accent-gold' },
          ].map((s) => (
            <div key={s.label} className="bg-bg-card border border-surface rounded-xl p-4">
              <p className="text-xs text-text-muted mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)}>+ Ajukan Izin</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface border-t-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-bg-card border border-surface rounded-xl p-10 text-center text-text-muted">
            Belum ada permohonan izin
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelectedReq(req)}
                className="w-full text-left bg-bg-card border border-surface rounded-xl p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary">
                        {jenisLabel[req.jenis_izin] ?? req.jenis_izin}
                      </span>
                      <LeaveStatusBadge status={req.status} />
                    </div>
                    <p className="text-sm text-text-muted">
                      {new Date(req.tanggal_mulai).toLocaleDateString('id-ID')}
                      {' — '}
                      {new Date(req.tanggal_selesai).toLocaleDateString('id-ID')}
                      {' '}
                      ({calcDuration(req.tanggal_mulai, req.tanggal_selesai)} hari)
                    </p>
                    <p className="text-sm text-text-muted mt-1 truncate">{req.alasan}</p>
                  </div>
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {new Date(req.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title="Detail Permohonan Izin"
        size="md"
        footer={<Button variant="ghost" onClick={() => setSelectedReq(null)}>Tutup</Button>}
      >
        {selectedReq && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Jenis Izin</span>
              <span className="text-text-primary font-medium">{jenisLabel[selectedReq.jenis_izin] ?? selectedReq.jenis_izin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Tanggal Mulai</span>
              <span className="text-text-primary">{new Date(selectedReq.tanggal_mulai).toLocaleDateString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Tanggal Selesai</span>
              <span className="text-text-primary">{new Date(selectedReq.tanggal_selesai).toLocaleDateString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Durasi</span>
              <span className="text-text-primary">{calcDuration(selectedReq.tanggal_mulai, selectedReq.tanggal_selesai)} hari</span>
            </div>
            <div className="flex justify-between items-start gap-3">
              <span className="text-text-muted">Alasan</span>
              <span className="text-text-primary text-right">{selectedReq.alasan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Status</span>
              <LeaveStatusBadge status={selectedReq.status} />
            </div>
            {selectedReq.reviewer && (
              <div className="flex justify-between">
                <span className="text-text-muted">Ditinjau oleh</span>
                <span className="text-text-primary">{selectedReq.reviewer.nama}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Ajukan Permohonan Izin"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>Kirim Permohonan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Jenis Izin</label>
            <select
              className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
              value={form.jenis_izin}
              onChange={(e) => setForm({ ...form, jenis_izin: e.target.value as typeof form.jenis_izin })}
            >
              <option value="cuti">🏖 Cuti</option>
              <option value="sakit">🤒 Sakit</option>
              <option value="dinas_luar">📋 Dinas Luar</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tanggal Mulai"
              type="date"
              min={today}
              value={form.tanggal_mulai}
              onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })}
            />
            <Input
              label="Tanggal Selesai"
              type="date"
              min={form.tanggal_mulai}
              value={form.tanggal_selesai}
              onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Alasan *</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              rows={4}
              placeholder="Jelaskan alasan permohonan izin Anda..."
              value={form.alasan}
              onChange={(e) => setForm({ ...form, alasan: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
