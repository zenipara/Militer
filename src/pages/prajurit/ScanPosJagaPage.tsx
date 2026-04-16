import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { usePosJagaStore } from '../../store/posJagaStore';
import { useGatePassStore } from '../../store/gatePassStore';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import type { ScanPosJagaResult } from '../../types';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

function PosJagaScanner({ onScan }: { onScan: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const scanner = new Html5QrcodeScanner(
      containerRef.current.id,
      { fps: 10, qrbox: 250 },
      false,
    );
    scanner.render(
      (decodedText: string) => {
        onScan(decodedText);
        scanner.clear();
      },
      () => {},
    );
    return () => {
      scanner.clear().catch(() => {});
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
  const isProcessingScanRef = useRef<boolean>(false);

  const handleScan = useCallback(
    async (token: string) => {
      // Ref is intentionally excluded from dependency array because useRef
      // returns a stable object across renders.
      if (state === 'success' || state === 'error' || isProcessingScanRef.current) return;
      isProcessingScanRef.current = true;
      setState('scanning');
      try {
        const res = await scanPosJaga(token);
        setResult(res);
        setState('success');
        // Refresh gate passes in background to reflect new status
        void fetchGatePasses();
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error('QR tidak valid');
        setErrorMsg(err.message);
        setState('error');
      } finally {
        isProcessingScanRef.current = false;
      }
    },
    [state, scanPosJaga, fetchGatePasses],
  );

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setErrorMsg(null);
    setScanning(false);
    isProcessingScanRef.current = false;
  };

  const statusLabel: Record<string, string> = {
    out: 'Keluar',
    returned: 'Kembali',
  };

  return (
    <DashboardLayout title="Scan Pos Jaga">
      <div className="max-w-md mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Scan Pos Jaga</h1>
          <p className="text-sm text-text-muted mt-1">
            Pindai QR statis yang tertempel di pos jaga untuk mencatat waktu keluar atau kembali.
          </p>
        </div>

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

        {/* Loading setelah scan */}
        {state === 'scanning' && (
          <div className="rounded-2xl border border-surface bg-bg-card p-6 flex flex-col items-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-text-muted">Memproses...</p>
          </div>
        )}

        {/* Berhasil */}
        {state === 'success' && result && (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
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
              <span className="text-3xl">❌</span>
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
