import React, { useState } from 'react';
import { useGatePassStore } from '../../store/gatePassStore';
import Input from '../common/Input';
import Button from '../common/Button';

export default function GatePassForm() {
  const [keperluan, setKeperluan] = useState('');
  const [tujuan, setTujuan] = useState('');
  const [waktuKeluar, setWaktuKeluar] = useState('');
  const [waktuKembali, setWaktuKembali] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createGatePass = useGatePassStore(s => s.createGatePass);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!keperluan || !tujuan || !waktuKeluar || !waktuKembali) {
      setError('Semua field wajib diisi.');
      return;
    }
    if (new Date(waktuKembali) <= new Date(waktuKeluar)) {
      setError('Waktu kembali harus setelah waktu keluar.');
      return;
    }
    setLoading(true);
    try {
      await createGatePass({
        keperluan,
        tujuan,
        waktu_keluar: waktuKeluar,
        waktu_kembali: waktuKembali,
      });
      setKeperluan(''); setTujuan(''); setWaktuKeluar(''); setWaktuKembali('');
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('Gagal mengajukan izin');
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-primary">
        Setelah submit, pengajuan otomatis disetujui. Verifikasi keluar dan kembali dilakukan dengan scan QR statis di Pos Jaga.
      </div>
      {error && (
        <div className="rounded-2xl border border-accent-red/20 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
          {error}
        </div>
      )}
      <Input
        label="Keperluan"
        placeholder="Keperluan"
        value={keperluan}
        onChange={(e) => setKeperluan(e.target.value)}
        required
      />
      <Input
        label="Tujuan"
        placeholder="Tujuan"
        value={tujuan}
        onChange={(e) => setTujuan(e.target.value)}
        required
      />
      <Input
        label="Waktu Keluar"
        type="datetime-local"
        value={waktuKeluar}
        onChange={(e) => setWaktuKeluar(e.target.value)}
        required
      />
      <Input
        label="Waktu Kembali"
        type="datetime-local"
        value={waktuKembali}
        onChange={(e) => setWaktuKembali(e.target.value)}
        required
      />
      <Button type="submit" variant="primary" size="lg" isLoading={loading} className="w-full">
        {loading ? 'Mengirim...' : 'Submit'}
      </Button>
    </form>
  );
}
