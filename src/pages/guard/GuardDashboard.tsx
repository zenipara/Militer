import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import QRScanner from '../../components/guard/QRScanner';
import ScanResultCard from '../../components/guard/ScanResultCard';
import { useGatePassStore } from '../../store/gatePassStore';
import { useGatePassRealtime } from '../../hooks/useGatePassRealtime';
import type { GatePass } from '../../types';

export default function GuardDashboard() {
  const scanGatePass = useGatePassStore(s => s.scanGatePass);
  const [result, setResult] = useState<GatePass | null>(null);
  const [error, setError] = useState<string | null>(null);
  useGatePassRealtime();

  const onScan = async (qr_token: string) => {
    setError(null);
    try {
      const gatePass = await scanGatePass(qr_token);
      setResult(gatePass);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('QR tidak valid');
      setError(err.message);
      setResult(null);
    }
  };

  return (
    <DashboardLayout title="Scan Gate Pass">
      <div className="grid gap-6 max-w-3xl mx-auto">
        <div className="rounded-3xl border border-surface bg-bg-card p-6 shadow-sm">
          <p className="text-sm text-text-muted mb-4">
            Arahkan QR Gate Pass ke kamera untuk memproses keluar/masuk. Hanya petugas guard yang dapat menggunakan halaman ini.
          </p>
          <QRScanner onScan={onScan} />
        </div>
        {error && (
          <div className="rounded-2xl border border-accent-red/20 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
            {error}
          </div>
        )}
        {result && <ScanResultCard data={result} />}
      </div>
    </DashboardLayout>
  );
}
