import React, { useState } from 'react';
import { useGatePassStore } from '../../store/gatePassStore';

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
      {error && <div className="alert alert-error text-sm">{error}</div>}
      <input className="input" placeholder="Keperluan" value={keperluan} onChange={e => setKeperluan(e.target.value)} required />
      <input className="input" placeholder="Tujuan" value={tujuan} onChange={e => setTujuan(e.target.value)} required />
      <input className="input" type="datetime-local" value={waktuKeluar} onChange={e => setWaktuKeluar(e.target.value)} required />
      <input className="input" type="datetime-local" value={waktuKembali} onChange={e => setWaktuKembali(e.target.value)} required />
      <button className="btn btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Mengajukan...' : 'Ajukan Izin'}</button>
    </form>
  );
}
