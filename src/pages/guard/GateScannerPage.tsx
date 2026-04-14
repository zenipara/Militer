import React, { useState } from 'react';
import GatePassScanner from '../../components/gatepass/GatePassScanner';
import { useGatePassStore } from '../../store/gatePassStore';

export default function GateScannerPage() {
  const scanGatePass = useGatePassStore(s => s.scanGatePass);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (qrToken: string) => {
    setError(null);
    try {
      const res = await scanGatePass(qrToken);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'QR tidak valid');
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">Scan Gate Pass</h1>
      <GatePassScanner onScan={handleScan} />
      {result && <div className="alert alert-success">{result}</div>}
      {error && <div className="alert alert-error">{error}</div>}
    </div>
  );
}
