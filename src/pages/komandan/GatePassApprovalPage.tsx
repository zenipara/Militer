import React, { useEffect } from 'react';
import { useGatePassStore } from '../../store/gatePassStore';
import GatePassStatusBadge from '../../components/gatepass/GatePassStatusBadge';

export default function GatePassApprovalPage() {
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);
  const approveGatePass = useGatePassStore(s => s.approveGatePass);

  useEffect(() => { fetchGatePasses(); }, [fetchGatePasses]);

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold">Approval Gate Pass</h1>
      <div className="space-y-2">
        {gatePasses.filter(gp => gp.status === 'pending').map(gp => (
          <div key={gp.id} className="p-3 border rounded flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="font-bold">{gp.tujuan}</div>
              <div className="text-xs text-gray-500">{gp.keperluan}</div>
              <div className="text-xs">{gp.waktu_keluar} - {gp.waktu_kembali}</div>
            </div>
            <GatePassStatusBadge gatePass={gp} />
            <div className="flex gap-2">
              <button className="btn btn-success" onClick={() => approveGatePass(gp.id, true)}>Approve</button>
              <button className="btn btn-error" onClick={() => approveGatePass(gp.id, false)}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
