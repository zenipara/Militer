import { useState } from 'react';
import GatePassScanner from '../../components/gatepass/GatePassScanner';
import { useGatePassStore } from '../../store/gatePassStore';
import Badge from '../../components/common/Badge';

export default function GateScannerPage() {
  const scanGatePass = useGatePassStore(s => s.scanGatePass);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (qrToken: string) => {
    setError(null);
    try {
      const res = await scanGatePass(qrToken);
      setResult(res);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('QR tidak valid');
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">Scan Gate Pass</h1>
      <GatePassScanner onScan={handleScan} />
      {result && (
        <div className="flex items-center gap-2">
          <Badge variant="success">{result}</Badge>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2">
          <Badge variant="error">{error}</Badge>
        </div>
      )}
    </div>
  );
}
