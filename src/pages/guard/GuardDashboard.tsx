import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import QRScanner from '../../components/guard/QRScanner';
import ScanResultCard from '../../components/guard/ScanResultCard';
import PageHeader from '../../components/ui/PageHeader';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import Button from '../../components/common/Button';
import { ICONS } from '../../icons';
import { useGatePassStore } from '../../store/gatePassStore';
import { useGatePassRealtime } from '../../hooks/useGatePassRealtime';
import type { GatePass } from '../../types';

export default function GuardDashboard() {
  const scanGatePass = useGatePassStore(s => s.scanGatePass);
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);
  const [scannerKey, setScannerKey] = useState(0);
  const [result, setResult] = useState<GatePass | null>(null);
  const [error, setError] = useState<string | null>(null);
  useGatePassRealtime();

  useEffect(() => {
    void fetchGatePasses();
  }, [fetchGatePasses]);

  const scanStats = useMemo(() => {
    return gatePasses.reduce(
      (acc, item) => {
        if (item.status === 'approved') acc.siapKeluar += 1;
        if (item.status === 'checked_in' || item.status === 'out') acc.diLuar += 1;
        if (item.status === 'overdue') acc.overdue += 1;
        if (item.status === 'completed' || item.status === 'returned') acc.selesai += 1;
        return acc;
      },
      { siapKeluar: 0, diLuar: 0, overdue: 0, selesai: 0 },
    );
  }, [gatePasses]);

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
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Pos Pemeriksaan Gate Pass"
          subtitle="Validasi QR personel untuk proses keluar dan masuk batalion"
          meta={
            <>
              <span>{scanStats.diLuar} personel sedang di luar</span>
              <span>{scanStats.overdue} overdue</span>
            </>
          }
          actions={
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setError(null);
                setScannerKey((prev) => prev + 1);
              }}
            >
              Scan Ulang
            </Button>
          }
        />

        <StatsGrid>
          <StatCard icon={<ICONS.ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />} label="Siap Keluar" value={scanStats.siapKeluar} />
          <StatCard icon={<ICONS.UserCheck className="h-5 w-5 text-accent-gold" aria-hidden="true" />} label="Sedang di Luar" value={scanStats.diLuar} />
          <StatCard icon={<ICONS.AlertTriangle className="h-5 w-5 text-accent-red" aria-hidden="true" />} label="Overdue" value={scanStats.overdue} />
          <StatCard icon={<ICONS.BadgeCheck className="h-5 w-5 text-success" aria-hidden="true" />} label="Selesai Hari Ini" value={scanStats.selesai} />
        </StatsGrid>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-surface bg-bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <ICONS.ScanLine className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-bold text-text-primary">Pemindaian QR</h3>
                <p className="mt-1 text-sm text-text-muted">
                  Arahkan QR Gate Pass ke kamera. Sistem akan otomatis memproses status keluar/masuk sesuai histori personel.
                </p>
              </div>
            </div>
            <QRScanner key={scannerKey} onScan={onScan} />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-surface bg-bg-card p-4">
              <h4 className="text-sm font-semibold text-text-primary">Checklist Petugas</h4>
              <ul className="mt-3 space-y-2 text-sm text-text-muted">
                <li>1. Pastikan identitas personel sesuai profil yang tampil.</li>
                <li>2. Verifikasi status: izin keluar atau izin masuk.</li>
                <li>3. Jika data tidak valid, hentikan proses dan laporkan ke komandan jaga.</li>
              </ul>
            </div>

            {error && (
              <div className="rounded-2xl border border-accent-red/20 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
                {error}
              </div>
            )}

            {result ? (
              <ScanResultCard data={result} />
            ) : (
              <div className="rounded-2xl border border-dashed border-surface/80 bg-bg-card p-6 text-sm text-text-muted">
                Hasil pemindaian akan tampil di panel ini setelah QR berhasil dibaca.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
