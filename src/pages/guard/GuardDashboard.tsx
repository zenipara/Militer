import React, { useState } from 'react';
import QRScanner from '../../components/guard/QRScanner';
import ScanResultCard from '../../components/guard/ScanResultCard';
import { handleGatePassScan } from '../../utils/gatepassScanHandler';

interface GatePassScanResult {
  user?: {
    nama?: string;
    nrp?: string;
  };
  status?: 'pending' | 'approved' | 'rejected' | 'out' | 'returned' | 'overdue';
  actual_keluar?: string | null;
  actual_kembali?: string | null;
}

export default function GuardDashboard() {
  const [result, setResult] = useState<GatePassScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onScan = async (qr_token: string) => {
    setError(null);
    try {
      const res = await handleGatePassScan(qr_token);
      setResult(res);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('QR tidak valid');
      setError(err.message);
      setResult(null);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold text-center">Scan Gate Pass</h1>
      <QRScanner onScan={onScan} />
      {error && <div className="alert alert-error">{error}</div>}
      {result && <ScanResultCard data={result} />}
    </div>
  );
}
