import React, { useEffect } from 'react';
import { useGatePassStore } from '../../store/gatePassStore';
import GatePassStatusBadge from '../../components/gatepass/GatePassStatusBadge';

export default function GatePassMonitorPage() {
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);

  useEffect(() => { fetchGatePasses(); }, [fetchGatePasses]);

  const keluar = gatePasses.filter(gp => gp.status === 'out');
  const overdue = gatePasses.filter(gp => gp.status === 'overdue');

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold">Monitoring Gate Pass</h1>
      <div>
        <h2 className="text-lg font-semibold mb-2">Sedang Keluar</h2>
        {keluar.length === 0 && <div className="text-gray-500">Tidak ada prajurit di luar.</div>}
        {keluar.map(gp => (
          <div key={gp.id} className="p-3 border rounded flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
            <div>
              <div className="font-bold">{gp.tujuan}</div>
              <div className="text-xs text-gray-500">{gp.keperluan}</div>
              <div className="text-xs">{gp.waktu_keluar} - {gp.waktu_kembali}</div>
            </div>
            <GatePassStatusBadge gatePass={gp} />
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Overdue (Terlambat Kembali)</h2>
        {overdue.length === 0 && <div className="text-gray-500">Tidak ada yang overdue.</div>}
        {overdue.map(gp => (
          <div key={gp.id} className="p-3 border border-pink-500 bg-pink-50 rounded flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
            <div>
              <div className="font-bold">{gp.tujuan}</div>
              <div className="text-xs text-gray-500">{gp.keperluan}</div>
              <div className="text-xs">{gp.waktu_keluar} - {gp.waktu_kembali}</div>
            </div>
            <GatePassStatusBadge gatePass={gp} />
          </div>
        ))}
      </div>
    </div>
  );
}
