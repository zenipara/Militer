import { useEffect, useState } from 'react';
import { usePosJagaStore } from '../../store/posJagaStore';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import PosJagaQRCode from '../../components/gatepass/PosJagaQRCode';
import { ICONS } from '../../icons';
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
      const created = await createPosJaga(nama.trim());
      setNama('');
      setSelected(created);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error('Gagal membuat pos jaga');
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = posJagaList.filter(p => p.is_active).length;

  return (
    <DashboardLayout title="Kelola Pos Jaga">
      <div className="space-y-6">
        <PageHeader
          title="Kelola Pos Jaga"
          subtitle="Tambah, aktifkan/nonaktifkan pos jaga, dan kelola QR statis untuk absensi personel."
          meta={
            <>
              <span>{posJagaList.length} pos terdaftar</span>
              <span>{activeCount} aktif</span>
            </>
          }
        />

        {/* Form tambah pos jaga */}
        <div className="app-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Tambah Pos Jaga Baru</h2>
              <p className="text-xs text-text-muted">Masukkan nama pos lalu klik Tambah untuk membuat QR statis.</p>
            </div>
          </div>
          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-accent-red/30 bg-gradient-to-r from-accent-red/10 to-rose-500/5 px-4 py-3 text-sm text-accent-red">
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg bg-accent-red/15">
                <ICONS.AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
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
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-gold/15 text-accent-gold">
              <ICONS.MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Daftar Pos Jaga</h2>
              <p className="text-xs text-text-muted">{posJagaList.length} pos terdaftar · {activeCount} sedang aktif</p>
            </div>
          </div>

          {posJagaList.length === 0 ? (
            <EmptyState
              title="Belum ada pos jaga"
              description="Tambahkan pos jaga baru di atas. Setiap pos akan mendapat QR statis yang bisa dicetak dan dipasang di lokasi."
              className="py-12"
            />
          ) : (
            <div className="space-y-2.5">
              {posJagaList.map((pos) => (
                <div
                  key={pos.id}
                  className="group app-card flex items-center justify-between gap-4 px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${pos.is_active ? 'bg-gradient-to-br from-success/20 to-emerald-600/10 text-success' : 'bg-surface/40 text-text-muted'}`}>
                      <ICONS.MapPin className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate">{pos.nama}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pos.is_active ? 'bg-success/10 text-success' : 'bg-accent-red/10 text-accent-red'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${pos.is_active ? 'bg-success' : 'bg-accent-red'}`} aria-hidden="true" />
                          {pos.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelected(pos)}
                    >
                      <span className="flex items-center gap-1.5">
                        <ICONS.QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                        Lihat QR
                      </span>
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
          )}
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
