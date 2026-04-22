import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { usePosJagaStore } from '../../store/posJagaStore';
import { useGatePassStore } from '../../store/gatePassStore';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from '../../components/ui/PageHeader';
import type { ScanPosJagaResult } from '../../types';

type ScanState = 'idle' | 'auth' | 'processing' | 'success' | 'error';

function PosJagaScanner({ onScan }: { onScan: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let scanner: { clear: () => Promise<void> } | null = null;

    const startScanner = async () => {
      if (!containerRef.current) return;
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      if (disposed || !containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth || window.innerWidth;
      const qrBoxSize = Math.min(Math.floor(containerWidth * 0.7), 250);
      const nextScanner = new Html5QrcodeScanner(
        containerRef.current.id,
        { fps: 10, qrbox: qrBoxSize },
        false,
      );
      scanner = nextScanner;

      nextScanner.render(
        (decodedText: string) => {
          onScan(decodedText);
          void nextScanner.clear();
        },
        () => {},
      );
    };

    void startScanner();

    return () => {
      disposed = true;
      void scanner?.clear().catch(() => {});
    };
  }, [onScan]);

  return <div id="pos-jaga-scanner" ref={containerRef} className="w-full" />;
}

export default function ScanPosJagaPage() {
  const scanPosJaga = usePosJagaStore(s => s.scanPosJaga);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);

  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanPosJagaResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [nrp, setNrp] = useState('');
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const isProcessingScanRef = useRef<boolean>(false);

  const handleScan = useCallback(
    (token: string) => {
      if (state === 'success' || state === 'error' || isProcessingScanRef.current) return;
      setScannedToken(token);
      setAuthError(null);
      setScanning(false);
      setState('auth');
    },
    [
      state,
    ],
  );

  const handleAuthorizeAndScan = async (e: FormEvent) => {
    e.preventDefault();
    if (!scannedToken) {
      setAuthError('QR belum dipindai. Silakan scan QR pos jaga terlebih dahulu.');
      return;
    }
    if (isProcessingScanRef.current) return;

    isProcessingScanRef.current = true;
    setAuthError(null);
    setErrorMsg(null);
    setState('processing');

    try {
      const res = await scanPosJaga(scannedToken, nrp, pin);
      setResult(res);
      setState('success');
      // Refresh gate passes in background to reflect new status
      void fetchGatePasses();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('Validasi NRP/PIN atau QR gagal');
      setErrorMsg(err.message);
      setState('error');
    } finally {
      isProcessingScanRef.current = false;
    }
  };

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setErrorMsg(null);
    setAuthError(null);
    setScannedToken(null);
    setNrp('');
    setPin('');
    setScanning(false);
  };

  const handleRescanQr = () => {
    setAuthError(null);
    setState('idle');
    setScanning(true);
  };

  const statusLabel: Record<string, string> = {
    checked_in: 'Sudah Keluar',
    completed: 'Sudah Kembali',
    out: 'Sudah Keluar',
    returned: 'Sudah Kembali',
  };

  return (
    <DashboardLayout title="Scan Pos Jaga">
      <div className="mx-auto max-w-md space-y-5">
        <PageHeader
          title="Scan Pos Jaga"
          subtitle="Pindai QR statis di pos jaga, lalu masukkan NRP dan PIN untuk mencatat izin keluar/kembali."
        />

        {/* Idle — tombol mulai scan */}
        {state === 'idle' && !scanning && (
          <div className="rounded-2xl border border-surface bg-bg-card p-6 flex flex-col items-center gap-4">
            <div className="text-5xl">📷</div>
            <p className="text-sm text-text-muted text-center">
              Tekan tombol di bawah lalu arahkan kamera ke QR code yang tertempel di pos jaga.
            </p>
            <Button variant="primary" size="lg" onClick={() => setScanning(true)}>
              Mulai Scan
            </Button>
          </div>
        )}

        {/* Scanner aktif */}
        {state === 'idle' && scanning && (
          <div className="rounded-2xl border border-surface bg-bg-card p-4 space-y-4">
            <PosJagaScanner onScan={handleScan} />
            <Button variant="secondary" size="sm" onClick={handleReset} className="w-full">
              Batal
            </Button>
          </div>
        )}

        {/* QR sudah dipindai, tunggu otorisasi NRP + PIN */}
        {state === 'auth' && (
          <div className="rounded-2xl border border-surface bg-bg-card p-6 space-y-4">
            <div className="text-sm text-text-muted">
              QR pos jaga terdeteksi. Masukkan NRP dan PIN untuk otorisasi izin keluar/kembali.
            </div>

            {authError && (
              <div className="rounded-xl border border-accent-red/30 bg-accent-red/5 px-4 py-3 text-sm text-accent-red">
                {authError}
              </div>
            )}

            <form className="space-y-3" onSubmit={handleAuthorizeAndScan}>
              <Input
                label="NRP"
                placeholder="Masukkan NRP"
                value={nrp}
                onChange={(event) => setNrp(event.target.value)}
                autoComplete="username"
                required
              />
              <Input
                label="PIN"
                type="password"
                placeholder="Masukkan PIN"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                autoComplete="current-password"
                required
              />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button type="button" variant="secondary" size="sm" onClick={handleRescanQr}>
                  Scan Ulang QR
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Validasi & Proses
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Loading setelah scan */}
        {state === 'processing' && (
          <div className="rounded-2xl border border-surface bg-bg-card p-6">
            <LoadingSpinner message="Memproses izin keluar/kembali..." />
          </div>
        )}

        {/* Berhasil */}
        {state === 'success' && result && (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 flex-shrink-0 text-success" aria-hidden="true" />
              <div>
                <div className="font-bold text-success text-lg">{result.message}</div>
                <div className="text-sm text-text-muted">Pos: {result.pos_nama}</div>
              </div>
            </div>
            <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success font-medium">
              Status gate pass: <strong>{statusLabel[result.status] ?? result.status}</strong>
            </div>
            <Button variant="primary" size="lg" onClick={handleReset} className="w-full">
              Scan Lagi
            </Button>
          </div>
        )}

        {/* Gagal */}
        {state === 'error' && (
          <div className="rounded-2xl border border-accent-red/30 bg-accent-red/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 flex-shrink-0 text-accent-red" aria-hidden="true" />
              <div>
                <div className="font-bold text-accent-red">Scan Gagal</div>
                <div className="text-sm text-text-muted">{errorMsg}</div>
              </div>
            </div>
            <Button variant="danger" size="lg" onClick={handleReset} className="w-full">
              Coba Lagi
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
