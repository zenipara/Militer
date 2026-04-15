import { useEffect, useState } from 'react';
import { usePosJagaStore } from '../../store/posJagaStore';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import PosJagaQRCode from '../../components/gatepass/PosJagaQRCode';
import type { PosJaga } from '../../types';

export default function PosJagaPage() {
  const posJagaList = usePosJagaStore(s => s.posJagaList);
  const fetchPosJaga = usePosJagaStore(s => s.fetchPosJaga);
  const createPosJaga = usePosJagaStore(s => s.createPosJaga);
  const setActive = usePosJagaStore(s => s.setActive);

  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PosJaga | null>(null);

  useEffect(() => {
    void fetchPosJaga();
  }, [fetchPosJaga]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setError('Nama pos jaga wajib diisi.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createPosJaga(nama.trim());
      setNama('');
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error('Gagal membuat pos jaga');
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Kelola Pos Jaga">
      <div className="max-w-2xl mx-auto py-8 space-y-8">
        <h1 className="text-2xl font-bold">Kelola Pos Jaga</h1>

        {/* Form tambah pos jaga */}
        <div className="rounded-2xl border border-surface bg-bg-card p-6 space-y-4">
          <h2 className="text-base font-semibold">Tambah Pos Jaga Baru</h2>
          {error && (
            <div className="rounded-xl border border-accent-red/20 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Nama Pos"
                placeholder="Mis: Pos Jaga Utara"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="primary" isLoading={loading}>
              Tambah
            </Button>
          </form>
        </div>

        {/* Daftar pos jaga */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Daftar Pos Jaga</h2>
          {posJagaList.length === 0 && (
            <div className="text-text-muted text-sm">Belum ada pos jaga. Tambahkan pos di atas.</div>
          )}
          {posJagaList.map((pos) => (
            <div
              key={pos.id}
              className="rounded-2xl border border-surface bg-bg-card px-5 py-4 flex items-center justify-between gap-4"
            >
              <div>
                <div className="font-semibold text-text-primary">{pos.nama}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {pos.is_active ? (
                    <span className="text-success font-medium">Aktif</span>
                  ) : (
                    <span className="text-accent-red font-medium">Nonaktif</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelected(pos)}
                >
                  Lihat QR
                </Button>
                <Button
                  variant={pos.is_active ? 'danger' : 'outline'}
                  size="sm"
                  onClick={() => void setActive(pos.id, !pos.is_active)}
                >
                  {pos.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal QR */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `QR — ${selected.nama}` : ''}
        size="sm"
      >
        {selected && <PosJagaQRCode posJaga={selected} />}
      </Modal>
    </DashboardLayout>
  );
}
